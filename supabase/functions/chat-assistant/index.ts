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

async function callOpenAI(openaiKey: string, messages: Record<string, unknown>[], maxTokens: number): Promise<Record<string, unknown> | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      max_tokens: maxTokens,
      messages,
    }),
  })
  if (!res.ok) {
    console.error("OpenAI API error:", res.status, await res.text())
    return null
  }
  const data = await res.json()
  return data
}

serve(async (req) => {
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
    const { itinerary_id, message } = await req.json()
    if (!itinerary_id || !message) {
      return new Response(
        JSON.stringify({ error: "itinerary_id e message sao obrigatorios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Fetch itinerary + answers + messages ---
    const [itinRes, answersRes, messagesRes] = await Promise.all([
      supabase.from("itineraries").select("id, generated_result").eq("id", itinerary_id).eq("user_id", userId).single(),
      supabase.from("itinerary_answers").select("nome, email, perfil, adultos, criancas, data_ida, data_volta, dias_total, cidades, hotel_estrelas, hotel_opcao, hotel_nome, passeios, ocasiao_especial, ocasiao_detalhe, orcamento, extras").eq("itinerary_id", itinerary_id).single(),
      supabase.from("chat_messages").select("role, content").eq("itinerary_id", itinerary_id).order("created_at", { ascending: true }).limit(50),
    ])

    const itinerary = itinRes.data
    if (!itinerary) {
      return new Response(
        JSON.stringify({ error: "Roteiro nao encontrado ou nao pertence ao usuario." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const answers = answersRes.data
    const existingMessages = messagesRes.data

    // --- Save user message ---
    const { error: insertUserError } = await supabase
      .from("chat_messages")
      .insert({ itinerary_id, user_id: userId, role: "user", content: message })

    if (insertUserError) {
      console.error("Error saving user message:", insertUserError)
      return new Response(
        JSON.stringify({ error: "Erro ao salvar mensagem." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Build conversation history ---
    const conversationHistory = [
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

    // --- Build itinerary context ---
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

    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da API OpenAI nao configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let replyText = ""
    let itineraryUpdated = false

    // ════════════════════════════════════════════════════════
    // STEP 1: Classify — does the user want to modify the itinerary?
    // ════════════════════════════════════════════════════════
    if (itinerary.generated_result) {
      const classifyPrompt = `Voce e um classificador. Analise a ultima mensagem do usuario no contexto da conversa e responda SOMENTE "SIM" ou "NAO".

Responda "SIM" se o usuario esta pedindo qualquer alteracao, ajuste, troca, adicao, remocao ou modificacao no roteiro ou orcamento da viagem. Exemplos: trocar passeio, inverter dias, adicionar atividade, remover passeio, mudar hotel, recalcular valores, etc.

Responda "NAO" se o usuario esta apenas fazendo uma pergunta, tirando duvida, pedindo informacao, agradecendo, ou qualquer coisa que NAO seja um pedido de alteracao no roteiro.

Responda apenas SIM ou NAO, nada mais.`

      const classifyData = await callOpenAI(openaiKey, [
        { role: "system", content: classifyPrompt },
        ...conversationHistory.slice(-6), // last few messages for context
      ], 5)

      const classification = (classifyData as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content?.trim()?.toUpperCase() || "NAO"
      console.log("[CHAT] Classification:", classification, "for message:", message.substring(0, 80))

      // ════════════════════════════════════════════════════════
      // STEP 2a: If modification requested, generate updated itinerary
      // ════════════════════════════════════════════════════════
      if (classification.startsWith("SIM")) {
        const modifySystemPrompt = `Voce e um assistente que modifica roteiros de viagem ao Uruguai. O cliente pediu uma alteracao. Aplique a alteracao solicitada e retorne o roteiro COMPLETO atualizado.

${itineraryRules}

INSTRUCOES:
- Retorne o roteiro COMPLETO (Pre-Roteiro dia a dia + Pre-Orcamento Estimado).
- Mantenha o mesmo formato markdown do roteiro original (## para secoes, ### para dias, - para bullets com emojis).
- Recalcule o orcamento se houver mudanca em passeios, noites ou transfers.
- Nao adicione explicacoes, apenas o roteiro atualizado.
- Se a alteracao pedida for impossivel, retorne o roteiro original sem modificacoes.

${itineraryContext}`

        const modifyData = await callOpenAI(openaiKey, [
          { role: "system", content: modifySystemPrompt },
          ...conversationHistory.slice(-6),
        ], 4000)

        const updatedContent = (modifyData as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || ""

        // Validate: must contain Pre-Roteiro structure
        if (updatedContent && (updatedContent.includes("## Pre-Roteiro") || updatedContent.includes("## Pré-Roteiro") || updatedContent.includes("### Dia"))) {
          const { error: updateError } = await supabase
            .from("itineraries")
            .update({ generated_result: updatedContent })
            .eq("id", itinerary_id)
            .eq("user_id", userId)

          if (updateError) {
            console.error("Error updating itinerary:", updateError)
          } else {
            itineraryUpdated = true
            console.log("[CHAT] Itinerary updated successfully, length:", updatedContent.length)
          }
        } else {
          console.log("[CHAT] Generated content did not pass validation, skipping update. Content start:", updatedContent.substring(0, 100))
        }

        // ════════════════════════════════════════════════════════
        // STEP 2b: Generate conversational reply acknowledging the change
        // ════════════════════════════════════════════════════════
        const replySystemPrompt = basePrompt + extraDocs + itineraryContext +
          (itineraryUpdated
            ? "\n\nVoce ACABOU de atualizar o roteiro do cliente com sucesso. A alteracao ja esta visivel na tela dele. Confirme brevemente o que foi alterado de forma simpatica e natural (2-3 frases). Nao repita o roteiro inteiro."
            : "\n\nVoce tentou alterar o roteiro mas nao foi possivel. Explique brevemente o motivo e sugira alternativas.")

        const replyData = await callOpenAI(openaiKey, [
          { role: "system", content: replySystemPrompt },
          ...conversationHistory,
        ], 350)

        replyText = (replyData as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || (itineraryUpdated ? "Pronto! Atualizei o seu roteiro. Da uma olhada!" : "Nao consegui aplicar a alteracao. Pode tentar de outra forma?")
      }
    }

    // ════════════════════════════════════════════════════════
    // STEP 2 (no modification): Regular chat response
    // ════════════════════════════════════════════════════════
    if (!replyText) {
      const chatSystemPrompt = basePrompt + extraDocs + itineraryContext
      const chatData = await callOpenAI(openaiKey, [
        { role: "system", content: chatSystemPrompt },
        ...conversationHistory,
      ], 350)

      replyText = (chatData as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || "Nao consegui responder agora. Tente novamente!"
    }

    // --- Save assistant response ---
    await supabase
      .from("chat_messages")
      .insert({ itinerary_id, user_id: userId, role: "assistant", content: replyText })

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
