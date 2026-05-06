import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import { KNOWLEDGE } from "../_shared/knowledge.ts"

async function getSystemPromptBase(supabase: ReturnType<typeof createClient>): Promise<string> {
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

// Helper: get weekday name in Portuguese
function getDiaSemana(date: Date): string {
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
  return dias[date.getDay()]
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

    // --- Body ---
    const { itinerary_id } = await req.json()
    if (!itinerary_id) {
      return new Response(
        JSON.stringify({ error: "itinerary_id e obrigatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- Fetch itinerary (validate ownership) ---
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

    // --- Fetch catalogs ---
    const [toursRes, citiesRes, profilesRes, transfersRes, hotelPricesRes] = await Promise.all([
      supabase.from("tours").select("*").eq("ativo", true).order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("travel_profiles").select("*").order("sort_order"),
      supabase.from("transfers").select("*").eq("ativo", true).order("sort_order"),
      supabase.from("hotel_prices").select("*"),
    ])

    const tours = toursRes.data || []
    const cities = citiesRes.data || []
    const profiles = profilesRes.data || []
    const transfers = transfersRes.data || []
    const hotelPrices = hotelPricesRes.data || []

    // --- Build data maps ---
    const total = (answers.adultos || 1) + (answers.criancas || 0)

    const citiesMap: Record<string, string> = {}
    for (const c of cities) {
      citiesMap[c.id] = c.nome
    }

    const cidadesObj = (answers.cidades || {}) as Record<string, number>
    const cidadesStr = Object.entries(cidadesObj)
      .map(([k, v]) => `${citiesMap[k] || k}: ${v} noites`)
      .join(", ")

    // Calculate total nights and trip dates
    const parseDate = (str: string): Date | null => {
      if (!str) return null
      const [d, m, y] = str.split("/")
      return new Date(Number(y), Number(m) - 1, Number(d))
    }

    const tripStart = parseDate(answers.data_ida)
    const tripEnd = parseDate(answers.data_volta)
    const totalNights = tripStart && tripEnd
      ? Math.round((tripEnd.getTime() - tripStart.getTime()) / 86400000)
      : (answers.dias_total && answers.dias_total > 1 ? answers.dias_total - 1 : 0)

    const totalDays = totalNights + 1

    // Build day-by-day calendar with weekdays
    let calendarioStr = ""
    if (tripStart && totalDays > 0) {
      const linhas: string[] = []
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(tripStart.getTime() + i * 86400000)
        const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        const diaSemana = getDiaSemana(d)
        let label = `Dia ${i + 1}`
        if (i === 0) label += " (CHEGADA)"
        if (i === totalDays - 1) label += " (PARTIDA)"
        linhas.push(`${label}: ${dateStr} - ${diaSemana}`)
      }
      calendarioStr = linhas.join("\n")
    }

    // Map tour IDs to tour objects
    const toursMap: Record<string, typeof tours[0]> = {}
    for (const t of tours) {
      toursMap[t.id] = t
    }

    // Build detailed tour info for selected tours (ALL of them, no slicing)
    const passeiosIds: string[] = answers.passeios || []
    const passeiosDetalhados = passeiosIds
      .map((id) => {
        const t = toursMap[id]
        if (!t) return null
        return `- ${t.nome} | Tipo: ${t.tipo_passeio || "Diurno"} | Preço: R$${t.valor_por_pessoa} | Duração: ${t.duration || "N/A"} | Saída: ${t.horario_saida || "N/A"} | Retorno: ${t.horario_retorno || "N/A"} | Disponibilidade: ${t.disponibilidade || "todos os dias"} | Cidade de partida: ${citiesMap[t.cidade_base] || t.cidade_base} | Link: ${t.link_url || "N/A"}`
      })
      .filter(Boolean)
      .join("\n")

    // Map profile
    const profileLabel = profiles.find((p: { id: string; label: string }) => p.id === answers.perfil)?.label || answers.perfil || "nao informado"

    // Occasion
    const ocasiao = answers.ocasiao_especial?.startsWith("Sim")
      ? (answers.ocasiao_detalhe || "sim") + " em " + (answers.ocasiao_data || "data a confirmar")
      : "nenhuma"

    // Dates string
    const datasStr = answers.data_ida
      ? `${answers.data_ida} a ${answers.data_volta}`
      : (answers.dias_total ? `${answers.dias_total} dias (${totalNights} noites)` : "flexivel")

    // Hotel string
    const hotelStr = answers.hotel_estrelas ? `${answers.hotel_estrelas} estrelas` : "nao informado"
    const hotelPref = answers.hotel_nome || answers.hotel_opcao || "quer sugestoes"

    // Build transfers pricing string
    const transfersStr = transfers.map(t => {
      const prices: string[] = []
      if (t.price_1_2 > 0) prices.push(`1-2 pax: R$${t.price_1_2}`)
      if (t.price_3_6 > 0) prices.push(`3-6 pax: R$${t.price_3_6}`)
      if (t.price_7_11 > 0) prices.push(`7-11 pax: R$${t.price_7_11}`)
      if (t.price_12_15 > 0) prices.push(`12-15 pax: R$${t.price_12_15}`)
      return `- ${t.nome}: ${prices.join(" | ")}`
    }).join("\n")

    // Build hotel pricing string
    const hotelPricingStr = hotelPrices.map(h => {
      return `- ${citiesMap[h.city_id] || h.city_id} ${h.hotel_style_id}★: ~R$${h.price_per_night}/noite por pessoa (${h.season_note || ""})`
    }).join("\n")

    // --- Build the prompt (clean, without conflicting hardcoded rules) ---
    const prompt = `Crie um PRE-ROTEIRO dia a dia e um PRE-ORCAMENTO completo para esta viagem.

═══════════════════════════════════════
DADOS DA VIAGEM:
═══════════════════════════════════════
Nome: ${answers.nome}
Perfil: ${profileLabel}
Adultos: ${answers.adultos || 1} | Criancas: ${answers.criancas || 0} | Total: ${total} pessoas
Datas: ${datasStr}
Total de noites: ${totalNights || "nao informado"}
Total de dias: ${totalDays}
Cidades e noites: ${cidadesStr || "a definir"}
Hotel: ${hotelStr} | ${hotelPref}
Ocasiao especial: ${ocasiao}
Orcamento por pessoa: ${answers.orcamento || "flexivel"}
Observacoes: ${answers.extras || "nenhuma"}

═══════════════════════════════════════
CALENDARIO DA VIAGEM (dias da semana):
═══════════════════════════════════════
${calendarioStr || "Datas nao informadas - considere dias genericos"}

═══════════════════════════════════════
PASSEIOS SELECIONADOS PELO CLIENTE:
═══════════════════════════════════════
${passeiosDetalhados || "Nenhum passeio selecionado"}

Observacao: Consulte as REGRAS do system prompt para saber o Tipo (Diurno/Noturno/Dia Todo), disponibilidade por dia da semana, e horarios de cada passeio. Distribua os passeios nos dias disponiveis respeitando todas as regras.

═══════════════════════════════════════
TABELA DE PRECOS DE TRANSFERS (por trecho, valor do grupo):
═══════════════════════════════════════
${transfersStr}

═══════════════════════════════════════
TABELA DE PRECOS DE HOSPEDAGEM (valor APROXIMADO por pessoa/noite):
═══════════════════════════════════════
${hotelPricingStr}

═══════════════════════════════════════
INSTRUCOES DE FORMATO:
═══════════════════════════════════════
Gere SOMENTE as duas secoes abaixo:

## Pre-Roteiro

Para cada dia, use o formato:
### Dia X - [data] ([dia da semana]) - [cidade]
(bullets com emojis: hotel=🏨, transfer=🚗, check-in=🛎️, check-out=🧳, chegada=✈️, partida=🛫, passeio=🎫, noite livre=🌙)

## Pre-Orcamento Estimado

Liste com emojis:
- 🎫 Passeios: cada passeio com valor por pessoa e link
- 🚗 Transfers: aeroporto ida+volta e entre cidades se aplicavel (valor do grupo)
- 🏨 Hospedagem: por cidade, noites x valor/pessoa = subtotal (valor APROXIMADO)
- 💰 TOTAL POR PESSOA e TOTAL DO GRUPO em destaque`

    // --- Fetch system prompt + itinerary rules from DB ---
    const [promptBase, itineraryRules] = await Promise.all([
      getSystemPromptBase(supabase),
      getItineraryRules(supabase),
    ])
    const systemPrompt = promptBase + "\n\n" + itineraryRules

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
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    })

    if (!aiRes.ok) {
      const errBody = await aiRes.text()
      console.error("OpenAI API error:", aiRes.status, errBody)
      return new Response(
        JSON.stringify({ error: "Erro ao gerar roteiro com a IA." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const aiData = await aiRes.json()
    const resultText = aiData.choices?.[0]?.message?.content || "Nao foi possivel gerar o roteiro. Entre em contato com nossa equipe."

    // --- Save result to DB ---
    const { error: updateError } = await supabase
      .from("itineraries")
      .update({
        generated_result: resultText,
        status: "generated",
      })
      .eq("id", itinerary_id)
      .eq("user_id", userId)

    if (updateError) {
      console.error("DB update error:", updateError)
      return new Response(
        JSON.stringify({ error: "Erro ao salvar roteiro no banco de dados." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ result: resultText }),
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
