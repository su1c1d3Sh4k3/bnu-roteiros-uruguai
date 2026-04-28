import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import { KNOWLEDGE } from "../_shared/knowledge.ts"

// Busca o prompt do banco; usa o hardcoded como fallback
async function getSystemPrompt(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("ai_prompt_config")
      .select("system_prompt")
      .eq("id", 1)
      .single()
    if (!error && data?.system_prompt) return data.system_prompt
  } catch (_) { /* fallback */ }
  return KNOWLEDGE
}

// Busca regras de roteiro (id=2)
async function getItineraryRules(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("ai_prompt_config")
      .select("system_prompt")
      .eq("id", 2)
      .single()
    if (!error && data?.system_prompt) return data.system_prompt
  } catch (_) { /* fallback */ }
  return ""
}

// Busca documentos de contexto ativos
async function getActiveDocuments(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data } = await supabase
      .from("ai_documents")
      .select("name, when_to_use, content_text")
      .eq("active", true)
      .neq("content_text", "")
    if (data && data.length > 0) {
      return "\n\n═══════════════════════════════════════\nDOCUMENTOS DE CONTEXTO ADICIONAIS:\n═══════════════════════════════════════\n" +
        data.map((d: { name: string; when_to_use: string; content_text: string }) =>
          `[${d.name}${d.when_to_use ? ` — usar quando: ${d.when_to_use}` : ""}]\n${d.content_text}`
        ).join("\n\n")
    }
  } catch (_) { /* ignore */ }
  return ""
}

// Tool definition for OpenAI function calling
const UPDATE_ITINERARY_TOOL = {
  type: "function" as const,
  function: {
    name: "update_itinerary",
    description: "Atualiza o roteiro e orcamento do cliente quando ele pede qualquer alteracao. Deve conter o roteiro COMPLETO atualizado (pre-roteiro + pre-orcamento), nao apenas a parte alterada.",
    parameters: {
      type: "object",
      properties: {
        updated_content: {
          type: "string",
          description: "O conteudo COMPLETO do roteiro atualizado, incluindo Pre-Roteiro dia a dia e Pre-Orcamento Estimado. Use o mesmo formato markdown do roteiro original."
        }
      },
      required: ["updated_content"]
    }
  }
}

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
    const { itinerary_id, message } = await req.json()
    if (!itinerary_id || !message) {
      return new Response(
        JSON.stringify({ error: "itinerary_id e message sao obrigatorios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Validate itinerary ownership + fetch generated result ---
    const { data: itinerary, error: itinError } = await supabase
      .from("itineraries")
      .select("id, generated_result")
      .eq("id", itinerary_id)
      .eq("user_id", userId)
      .single()

    if (itinError || !itinerary) {
      return new Response(
        JSON.stringify({ error: "Roteiro nao encontrado ou nao pertence ao usuario." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Fetch wizard answers for this itinerary ---
    const { data: answers } = await supabase
      .from("itinerary_answers")
      .select("nome, email, perfil, adultos, criancas, data_ida, data_volta, dias_total, cidades, hotel_estrelas, hotel_opcao, hotel_nome, passeios, ocasiao_especial, ocasiao_detalhe, orcamento, extras")
      .eq("itinerary_id", itinerary_id)
      .single()

    // --- Fetch last 50 chat messages for context ---
    const { data: existingMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("itinerary_id", itinerary_id)
      .order("created_at", { ascending: true })
      .limit(50)

    // --- Save user message ---
    const { error: insertUserError } = await supabase
      .from("chat_messages")
      .insert({
        itinerary_id,
        user_id: userId,
        role: "user",
        content: message,
      })

    if (insertUserError) {
      console.error("Error saving user message:", insertUserError)
      return new Response(
        JSON.stringify({ error: "Erro ao salvar mensagem." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Build messages array for AI ---
    const messagesForAI = [
      ...(existingMessages || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ]

    // --- Fetch dynamic prompt + documents + itinerary rules ---
    const [basePrompt, extraDocs, itineraryRules] = await Promise.all([
      getSystemPrompt(supabase),
      getActiveDocuments(supabase),
      getItineraryRules(supabase),
    ])

    // --- Build itinerary context for the AI ---
    let itineraryContext = ""
    if (answers) {
      itineraryContext += "\n\n═══════════════════════════════════════\nDADOS DO CLIENTE E DA VIAGEM:\n═══════════════════════════════════════\n"
      itineraryContext += `Nome: ${answers.nome || "N/A"}\n`
      itineraryContext += `Perfil: ${answers.perfil || "N/A"}\n`
      itineraryContext += `Adultos: ${answers.adultos || 0}, Criancas: ${answers.criancas || 0}\n`
      if (answers.data_ida) itineraryContext += `Periodo: ${answers.data_ida} a ${answers.data_volta || "N/A"} (${answers.dias_total || "?"} dias)\n`
      if (answers.cidades) itineraryContext += `Cidades: ${JSON.stringify(answers.cidades)}\n`
      if (answers.hotel_estrelas) itineraryContext += `Hotel: ${answers.hotel_estrelas} estrelas${answers.hotel_opcao ? ` (${answers.hotel_opcao})` : ""}${answers.hotel_nome ? ` - ${answers.hotel_nome}` : ""}\n`
      if (answers.passeios) itineraryContext += `Passeios escolhidos: ${Array.isArray(answers.passeios) ? answers.passeios.join(", ") : JSON.stringify(answers.passeios)}\n`
      if (answers.ocasiao_especial) itineraryContext += `Ocasiao especial: ${answers.ocasiao_detalhe || answers.ocasiao_especial}\n`
      if (answers.orcamento) itineraryContext += `Orcamento: ${answers.orcamento}\n`
      if (answers.extras) itineraryContext += `Extras: ${answers.extras}\n`
    }
    if (itinerary.generated_result) {
      itineraryContext += "\n═══════════════════════════════════════\nROTEIRO ATUAL DO CLIENTE:\n═══════════════════════════════════════\n"
      itineraryContext += itinerary.generated_result
    }

    // --- Itinerary modification instructions ---
    let modificationInstructions = ""
    if (itinerary.generated_result) {
      modificationInstructions = `\n\n═══════════════════════════════════════
INSTRUCOES PARA ALTERACAO DE ROTEIRO:
═══════════════════════════════════════
Voce tem a capacidade de ALTERAR o roteiro do cliente em tempo real. Quando o cliente pedir qualquer modificacao no roteiro (trocar passeio, inverter dias, mudar hotel, adicionar/remover atividade, recalcular orcamento, etc.), voce DEVE usar a funcao update_itinerary para aplicar a alteracao.

REGRAS para alteracao:
1. Sempre envie o roteiro COMPLETO atualizado (Pre-Roteiro + Pre-Orcamento), nao apenas o trecho alterado.
2. Mantenha o mesmo formato markdown do roteiro original.
3. Recalcule o orcamento quando houver mudanca nos passeios, noites ou transfers.
4. Siga as regras de roteiro: ${itineraryRules}
5. Apos aplicar a alteracao, confirme ao cliente o que foi mudado de forma breve e simpatica.
6. Se o cliente pedir algo impossivel (ex: passeio que nao existe), explique e sugira alternativas SEM alterar o roteiro.
7. Para perguntas gerais ou duvidas que NAO pedem alteracao, responda normalmente sem usar a funcao.`
    }

    const systemPrompt = basePrompt + extraDocs + itineraryContext + modificationInstructions

    // --- Call OpenAI API (GPT-4.1) with function calling ---
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da API OpenAI nao configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const aiPayload: Record<string, unknown> = {
      model: "gpt-4.1",
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        ...messagesForAI,
      ],
    }

    // Only offer the tool if there's an existing itinerary to modify
    if (itinerary.generated_result) {
      aiPayload.tools = [UPDATE_ITINERARY_TOOL]
      aiPayload.tool_choice = "auto"
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(aiPayload),
    })

    if (!aiRes.ok) {
      const errBody = await aiRes.text()
      console.error("OpenAI API error:", aiRes.status, errBody)
      return new Response(
        JSON.stringify({ error: "Erro ao obter resposta da IA." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const aiData = await aiRes.json()
    const choice = aiData.choices?.[0]

    let replyText = ""
    let itineraryUpdated = false

    // Check if the AI wants to call the update_itinerary function
    if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length > 0) {
      const toolCalls = choice.message.tool_calls || []
      const updateCall = toolCalls.find((tc: { function: { name: string } }) => tc.function.name === "update_itinerary")

      if (updateCall) {
        try {
          const args = JSON.parse(updateCall.function.arguments)
          const updatedContent = args.updated_content

          if (updatedContent) {
            // Save updated itinerary to DB
            const { error: updateError } = await supabase
              .from("itineraries")
              .update({ generated_result: updatedContent })
              .eq("id", itinerary_id)
              .eq("user_id", userId)

            if (updateError) {
              console.error("Error updating itinerary:", updateError)
            } else {
              itineraryUpdated = true
            }
          }
        } catch (e) {
          console.error("Error parsing tool call:", e)
        }

        // Make a follow-up call to get the conversational reply
        const followUpMessages = [
          { role: "system", content: systemPrompt },
          ...messagesForAI,
          choice.message,
          {
            role: "tool",
            tool_call_id: updateCall.id,
            content: itineraryUpdated
              ? "Roteiro atualizado com sucesso. O cliente ja esta vendo a versao atualizada na tela."
              : "Erro ao atualizar o roteiro. Informe o cliente que houve um problema."
          },
        ]

        const followUpRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1",
            max_tokens: 350,
            messages: followUpMessages,
          }),
        })

        if (followUpRes.ok) {
          const followUpData = await followUpRes.json()
          replyText = followUpData.choices?.[0]?.message?.content || "Pronto! Atualizei o seu roteiro."
        } else {
          replyText = itineraryUpdated
            ? "Pronto! Atualizei o seu roteiro com as alteracoes solicitadas. Da uma olhada na tela!"
            : "Ops, tive um problema ao atualizar o roteiro. Pode tentar novamente?"
        }
      }
    }

    // If no tool was called, use the direct reply
    if (!replyText) {
      replyText = choice?.message?.content || "Nao consegui responder agora. Tente novamente!"
    }

    // --- Save assistant response ---
    const { error: insertAssistantError } = await supabase
      .from("chat_messages")
      .insert({
        itinerary_id,
        user_id: userId,
        role: "assistant",
        content: replyText,
      })

    if (insertAssistantError) {
      console.error("Error saving assistant message:", insertAssistantError)
    }

    return new Response(
      JSON.stringify({ reply: replyText, itinerary_updated: itineraryUpdated }),
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
