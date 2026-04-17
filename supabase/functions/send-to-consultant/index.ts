import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticacao ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token invalido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const userId = user.id

    // --- Body ---
    const { itinerary_id } = await req.json()
    if (!itinerary_id) {
      return new Response(
        JSON.stringify({ error: "itinerary_id e obrigatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Fetch itinerary (validate ownership + status) ---
    const { data: itinerary, error: itinError } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", itinerary_id)
      .eq("user_id", userId)
      .single()

    if (itinError || !itinerary) {
      return new Response(
        JSON.stringify({ error: "Roteiro nao encontrado ou nao pertence ao usuario." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (itinerary.status !== "generated") {
      return new Response(
        JSON.stringify({ error: "O roteiro precisa estar gerado antes de enviar para a consultora. Status atual: " + itinerary.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Fetch answers ---
    const { data: answers, error: ansError } = await supabase
      .from("itinerary_answers")
      .select("*")
      .eq("itinerary_id", itinerary_id)
      .single()

    if (ansError || !answers) {
      return new Response(
        JSON.stringify({ error: "Respostas do roteiro nao encontradas." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Build email body (same as original JSX) ---
    const datasStr = answers.data_ida
      ? answers.data_ida + " a " + answers.data_volta
      : (answers.dias_total || "flexivel")

    const emailBody = `NOVA SOLICITACAO DE ROTEIRO - Brasileiros no Uruguai
Nome: ${answers.nome} | WhatsApp: ${answers.whatsapp} | E-mail: ${answers.email}
Origem: ${answers.origem || ""} | Perfil: ${answers.perfil}
Adultos: ${answers.adultos} | Criancas: ${answers.criancas}
Datas: ${datasStr}
Cidades: ${JSON.stringify(answers.cidades)}
Hotel: ${answers.hotel_estrelas} estrelas
Passeios: ${(answers.passeios || []).join(", ")}
Ocasiao: ${answers.ocasiao_detalhe || "nenhuma"}
Orcamento: ${answers.orcamento}
Obs: ${answers.extras || "nenhuma"}

PRE-ROTEIRO:
${itinerary.generated_result}`

    // --- Call OpenAI API (GPT-4.1) for confirmation message ---
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da API OpenAI nao configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let confirmationText = "Solicitacao enviada com sucesso!"

    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Confirme de forma breve e cordial que o pre-roteiro foi enviado para o e-mail do cliente (${answers.email}) e que a Consultora Especialista recebeu uma copia para dar continuidade. Assine como Brasileiros no Uruguai. Responda em portugues sem usar travessao.\n\n${emailBody}`,
          }],
        }),
      })

      if (aiRes.ok) {
        const aiData = await aiRes.json()
        confirmationText = aiData.choices?.[0]?.message?.content || confirmationText
      }
    } catch (aiErr) {
      console.error("AI confirmation error (non-fatal):", aiErr)
      confirmationText = "Solicitacao registrada! A Consultora Especialista entrara em contato em breve."
    }

    // --- Update itinerary ---
    const { error: updateError } = await supabase
      .from("itineraries")
      .update({
        status: "sent_to_consultant",
        consultant_response: confirmationText,
        sent_at: new Date().toISOString(),
      })
      .eq("id", itinerary_id)
      .eq("user_id", userId)

    if (updateError) {
      console.error("DB update error:", updateError)
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar status do roteiro." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ message: confirmationText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    console.error("Unexpected error:", err)
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
