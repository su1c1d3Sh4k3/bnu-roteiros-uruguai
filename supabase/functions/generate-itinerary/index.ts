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

const ITINERARY_RULES_FALLBACK = "REGRAS ABSOLUTAS: (1) Cada passeio ocupa 1 dia inteiro — NUNCA coloque 2 passeios no mesmo dia. (2) Dia 1 (chegada) e ultimo dia (partida) nao tem passeio. (3) Apresente APENAS os passeios listados em PASSEIOS QUE CABEM NO ROTEIRO. NUNCA invente atividades, restaurantes ou outras atracoes. (4) Nao use negrito no Pre-Roteiro. (5) Use emojis nos bullets. (6) Responda em portugues sem travessao. (7) Valores de hospedagem sao SEMPRE aproximados — indicar isso claramente. (8) NUNCA sugira hoteis especificos — isso e responsabilidade exclusiva da Consultora Especialista."

async function getItineraryRules(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("ai_prompt_config")
      .select("system_prompt")
      .eq("id", 2)
      .single()
    if (!error && data?.system_prompt) return data.system_prompt
  } catch (_) { /* fallback */ }
  return ITINERARY_RULES_FALLBACK
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
    const { data: tours } = await supabase
      .from("tours")
      .select("*")
      .eq("ativo", true)
      .order("sort_order")

    const { data: cities } = await supabase
      .from("cities")
      .select("*")
      .order("sort_order")

    const { data: profiles } = await supabase
      .from("travel_profiles")
      .select("*")
      .order("sort_order")

    // --- Build prompt (exact same logic as original JSX) ---
    const total = (answers.adultos || 1) + (answers.criancas || 0)

    const citiesMap: Record<string, string> = {}
    for (const c of (cities || [])) {
      citiesMap[c.id] = c.nome
    }

    const cidadesObj = (answers.cidades || {}) as Record<string, number>
    const cidadesStr = Object.entries(cidadesObj)
      .map(([k, v]) => `${citiesMap[k] || k}: ${v} noites`)
      .join(", ")

    // Calculate total nights
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

    const diasDisponiveisParaPasseios = totalNights

    // Map tour IDs to tour objects
    const toursMap: Record<string, { id: string; nome: string; valor_por_pessoa: number }> = {}
    for (const t of (tours || [])) {
      toursMap[t.id] = t
    }

    const passeiosIds: string[] = answers.passeios || []
    const passeiosValidos = passeiosIds.slice(0, Math.max(0, diasDisponiveisParaPasseios))
    const passeiosCortados = passeiosIds.slice(Math.max(0, diasDisponiveisParaPasseios))

    const passeiosSel = passeiosValidos
      .map((id) => toursMap[id]?.nome)
      .filter(Boolean)
      .join(", ")

    const passeiosNaoEncaixados = passeiosCortados
      .map((id) => toursMap[id]?.nome)
      .filter(Boolean)
      .join(", ")

    const avisoPasseios = passeiosNaoEncaixados
      ? `ATENCAO: Os seguintes passeios NAO foram incluidos no roteiro pois nao ha dias suficientes: ${passeiosNaoEncaixados}. Informe isso claramente ao cliente no inicio do Pre-Roteiro com um aviso de destaque.`
      : ""

    // Map profile
    const profileLabel = (profiles || []).find((p: { id: string; label: string }) => p.id === answers.perfil)?.label || answers.perfil || "nao informado"

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

    const prompt = `Crie um PRE-ROTEIRO dia a dia e um PRE-ORCAMENTO completo.

DADOS DA VIAGEM:
Nome: ${answers.nome}
Perfil: ${profileLabel}
Adultos: ${answers.adultos || 1} | Criancas: ${answers.criancas || 0} | Total: ${total} pessoas
Datas: ${datasStr}
Total de noites: ${totalNights || "nao informado"}
Cidades e noites: ${cidadesStr || "a definir"}
Hotel: ${hotelStr} | ${hotelPref}
PASSEIOS QUE CABEM NO ROTEIRO (um por dia, maximo ${diasDisponiveisParaPasseios} passeio${diasDisponiveisParaPasseios !== 1 ? "s" : ""}): ${passeiosSel || "nenhum selecionado"}
${avisoPasseios}
Ocasiao especial: ${ocasiao}
Orcamento: ${answers.orcamento || "flexivel"}
Observacoes: ${answers.extras || "nenhuma"}

REGRAS ABSOLUTAS DO ROTEIRO:
1. CADA PASSEIO OCUPA UM DIA INTEIRO. Nunca coloque 2 passeios no mesmo dia.
2. O Dia 1 (chegada) e o ultimo dia (partida) NAO TEM passeio — sao dias de viagem.
3. Passeios de Bodega e City Tours sao passeios independentes — nunca combine dois no mesmo dia.
4. O roteiro e composto SOMENTE por: check-in/check-out no hotel, transfers e os passeios listados acima. NADA mais.
5. Se houver aviso de passeios nao encaixados, exiba no inicio: "⚠️ Aviso: [passeio] nao foi incluido pois nao ha dias suficientes."
6. Nao use negrito no Pre-Roteiro.
7. Use emojis nos bullets: hotel=🏨, transfer=🚗, check-in=🛎️, check-out=🧳, chegada=✈️, partida=🛫, vinho=🍷, noite livre=🌙

REGRA DE DISTRIBUICAO DE NOITES POR CIDADE (CRITICA — SIGA EXATAMENTE):
- "X noites em CidadeA" significa que o cliente dorme X vezes em CidadeA, ou seja, acorda X vezes na CidadeA.
- O cliente so muda de cidade DEPOIS de ter completado todas as noites previstas naquela cidade.
- EXEMPLO CORRETO para "4 noites Montevideo + 1 noite Punta del Este" em viagem de 23/03 a 28/03:
  - Noite 1: 23→24 em Montevideo (dorme em Montevideo)
  - Noite 2: 24→25 em Montevideo (dorme em Montevideo)
  - Noite 3: 25→26 em Montevideo (dorme em Montevideo)
  - Noite 4: 26→27 em Montevideo (dorme em Montevideo) ← quarta noite em Montevideo
  - Dia 5 (27/03): check-out Montevideo, viagem para Punta del Este
  - Noite 5: 27→28 em Punta del Este (dorme em Punta) ← unica noite em Punta
  - Dia 6 (28/03): check-out Punta, partida
- ERRO A EVITAR: nao antecipar a mudanca de cidade. Se sao 4 noites em Montevideo, o cliente SEM FAIL deve dormir 4 vezes em Montevideo antes de ir para a proxima cidade.
- Applique essa logica para qualquer combinacao de cidades e noites.

Gere SOMENTE as duas secoes abaixo:

## Pre-Roteiro

### Dia 1 - Chegada - [cidade inicial]
- ✈️ Chegada
- 🚗 Transfer aeroporto ao hotel (se contratado)
- 🛎️ Check-in no hotel
- 🌙 Noite livre

(para cada cidade subsequente, o cliente so se muda apos completar todas as noites previstas na cidade anterior)

### Dia [ultimo] - Partida - [cidade final]
- 🧳 Check-out
- 🚗 Transfer ao aeroporto (se contratado)
- ✈️ Retorno ao Brasil

## Pre-Orcamento Estimado

Liste com emojis:
- 🎫 Passeios: apenas os passeios que cabem no roteiro, valor por pessoa e total
- 🚗 Transfers: aeroporto ida+volta e entre cidades se aplicavel
- 🏨 Hospedagem: por cidade, noites x valor/pessoa = subtotal (valor aproximado)
- TOTAL POR PESSOA e TOTAL DO GRUPO em destaque

Calcule o orcamento apenas com os passeios que cabem no roteiro (nao incluir os que foram cortados). Use valores exatos da base de dados.`

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
