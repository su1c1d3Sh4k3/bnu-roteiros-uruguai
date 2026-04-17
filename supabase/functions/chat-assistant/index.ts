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

    // --- Validate itinerary ownership ---
    const { data: itinerary, error: itinError } = await supabase
      .from("itineraries")
      .select("id")
      .eq("id", itinerary_id)
      .eq("user_id", userId)
      .single()

    if (itinError || !itinerary) {
      return new Response(
        JSON.stringify({ error: "Roteiro nao encontrado ou nao pertence ao usuario." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

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

    // --- Build messages array for Claude ---
    const messagesForAI = [
      ...(existingMessages || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ]

    // --- Fetch dynamic prompt + documents ---
    const [basePrompt, extraDocs] = await Promise.all([
      getSystemPrompt(supabase),
      getActiveDocuments(supabase),
    ])
    const systemPrompt = basePrompt + extraDocs

    // --- Call OpenAI API (GPT-4.1) ---
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da API OpenAI nao configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_tokens: 350,
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesForAI,
        ],
      }),
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
    const replyText = aiData.choices?.[0]?.message?.content || "Nao consegui responder agora. Tente novamente!"

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
      JSON.stringify({ reply: replyText }),
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
