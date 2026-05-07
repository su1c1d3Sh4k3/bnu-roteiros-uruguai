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

// Helper: check if a weekday matches tour availability
function isDayAvailable(diaSemana: string, disponibilidade: string): boolean {
  if (!disponibilidade) return true
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[áàâã]/g, "a")
    .replace(/[éèê]/g, "e")
    .replace(/[íìî]/g, "i")
    .replace(/[óòôõ]/g, "o")
    .replace(/[úùû]/g, "u")
    .replace(/[ç]/g, "c")
  const disp = normalize(disponibilidade)
  if (disp.includes("todos os dias")) return true

  const diaClean = normalize(diaSemana)

  // Map day names to check tokens
  const dayTokens: Record<string, string[]> = {
    "segunda-feira": ["segunda"],
    "terca-feira": ["terca"],
    "quarta-feira": ["quarta"],
    "quinta-feira": ["quinta"],
    "sexta-feira": ["sexta"],
    "sabado": ["sabado"],
    "domingo": ["domingo"],
  }

  const tokens = dayTokens[diaClean] || [diaClean.replace("-feira", "")]

  // Check if any token is found or if it's in a range (e.g., "terca a domingo")
  for (const token of tokens) {
    if (disp.includes(token)) return true
  }

  // Check range patterns like "terca a domingo"
  const rangeMatch = disp.match(/(\w+)\s+a\s+(\w+)/)
  if (rangeMatch) {
    const order = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]
    const startIdx = order.findIndex(d => rangeMatch[1].includes(d))
    const endIdx = order.findIndex(d => rangeMatch[2].includes(d))
    const dayIdx = order.findIndex(d => tokens[0].includes(d))
    if (startIdx >= 0 && endIdx >= 0 && dayIdx >= 0) {
      if (startIdx <= endIdx) {
        return dayIdx >= startIdx && dayIdx <= endIdx
      } else {
        return dayIdx >= startIdx || dayIdx <= endIdx
      }
    }
  }

  return false
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

    // Pre-calculate which days each tour can be scheduled on
    // Build city schedule: which city is the client in on each day
    const citySchedule: string[] = [] // city_id per day
    if (totalDays > 0) {
      const cidadesOrdem = Object.entries(cidadesObj)
      let dayIdx = 0
      for (const [cityId, nights] of cidadesOrdem) {
        // First city: includes arrival day
        if (dayIdx === 0) {
          citySchedule.push(cityId) // arrival day
          dayIdx++
        }
        // Fill the nights (each night = waking up in that city)
        for (let n = 0; n < (nights as number); n++) {
          if (dayIdx < totalDays) {
            citySchedule.push(cityId)
            dayIdx++
          }
        }
      }
      // Fill remaining days
      while (citySchedule.length < totalDays) {
        citySchedule.push(cidadesOrdem[cidadesOrdem.length - 1]?.[0] || "mvd")
      }
    }

    // For each tour, compute possible days
    interface TourAllocation {
      id: string
      nome: string
      tipo: string
      preco: number
      duracao: string
      saida: string
      retorno: string
      disponibilidade: string
      cidadePartida: string
      link: string
      diasPossiveis: number[] // day indices (0-based)
    }

    const tourAllocations: TourAllocation[] = []
    for (const id of passeiosIds) {
      const t = toursMap[id]
      if (!t) continue

      const diasPossiveis: number[] = []
      if (tripStart && totalDays > 0) {
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(tripStart.getTime() + i * 86400000)
          const diaSemana = getDiaSemana(d)
          const isArrival = i === 0
          const isDeparture = i === totalDays - 1
          const cityOnDay = citySchedule[i] || ""
          const tipo = (t.tipo_passeio || "Diurno")

          if (isDeparture) continue
          if (isArrival && tipo !== "Noturno") continue
          if (cityOnDay !== t.cidade_base) continue
          if (!isDayAvailable(diaSemana, t.disponibilidade || "todos os dias")) continue

          diasPossiveis.push(i)
        }
      }

      tourAllocations.push({
        id,
        nome: t.nome,
        tipo: t.tipo_passeio || "Diurno",
        preco: t.valor_por_pessoa,
        duracao: t.duration || "N/A",
        saida: t.horario_saida || "N/A",
        retorno: t.horario_retorno || "N/A",
        disponibilidade: t.disponibilidade || "todos os dias",
        cidadePartida: citiesMap[t.cidade_base] || t.cidade_base,
        link: t.link_url || "N/A",
        diasPossiveis,
      })
    }

    // Sort by fewest options first (constraint propagation)
    tourAllocations.sort((a, b) => a.diasPossiveis.length - b.diasPossiveis.length)

    // Generate a suggested allocation (greedy by constraint)
    const dayAssignments: Map<number, string[]> = new Map() // day -> tour names
    const unallocated: string[] = []

    for (const tour of tourAllocations) {
      if (tour.diasPossiveis.length === 0) {
        unallocated.push(tour.nome)
        continue
      }

      let allocated = false
      for (const dayIdx of tour.diasPossiveis) {
        const existing = dayAssignments.get(dayIdx) || []
        const existingTours = existing.map(name => tourAllocations.find(ta => ta.nome === name))

        // Check compatibility
        if (tour.tipo === "Dia Todo") {
          // Dia Todo needs empty day
          if (existing.length === 0) {
            dayAssignments.set(dayIdx, [tour.nome])
            allocated = true
            break
          }
        } else if (tour.tipo === "Noturno") {
          // Noturno can go with Diurno, not with Dia Todo
          const hasDiaTodo = existingTours.some(et => et?.tipo === "Dia Todo")
          const hasNoturno = existingTours.some(et => et?.tipo === "Noturno")
          if (!hasDiaTodo && !hasNoturno) {
            dayAssignments.set(dayIdx, [...existing, tour.nome])
            allocated = true
            break
          }
        } else {
          // Diurno can go with Noturno, not with Dia Todo or another Diurno
          const hasDiaTodo = existingTours.some(et => et?.tipo === "Dia Todo")
          const hasDiurno = existingTours.some(et => et?.tipo === "Diurno")
          if (!hasDiaTodo && !hasDiurno) {
            dayAssignments.set(dayIdx, [...existing, tour.nome])
            allocated = true
            break
          }
        }
      }

      if (!allocated) {
        unallocated.push(tour.nome)
      }
    }

    // Build the suggested schedule text
    let suggestedScheduleStr = ""
    if (tripStart) {
      const lines: string[] = []
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(tripStart.getTime() + i * 86400000)
        const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
        const diaSemana = getDiaSemana(d)
        const assigned = dayAssignments.get(i) || []
        let dayLabel = `Dia ${i + 1} (${dateStr}, ${diaSemana}) [${citiesMap[citySchedule[i]] || citySchedule[i]}]`
        if (i === 0) dayLabel += " → CHEGADA: transfer aeroporto→hotel"
        if (i === totalDays - 1) dayLabel += " → PARTIDA: transfer hotel→aeroporto (NENHUM passeio)"

        if (assigned.length > 0 && i !== totalDays - 1) {
          dayLabel += ` → ${assigned.join(" + ")}`
        } else if (i > 0 && i < totalDays - 1 && assigned.length === 0) {
          dayLabel += " → Dia livre"
        }
        lines.push(dayLabel)
      }
      suggestedScheduleStr = lines.join("\n")
    }

    // Build passeios detalhados
    const passeiosDetalhados = tourAllocations
      .map(ta => `- ${ta.nome} | Tipo: ${ta.tipo} | Preço: R$${ta.preco} | Duração: ${ta.duracao} | Saída: ${ta.saida} | Retorno: ${ta.retorno} | Disponibilidade: ${ta.disponibilidade} | Cidade de partida: ${ta.cidadePartida} | Link: ${ta.link}`)
      .join("\n")

    const unallocatedStr = unallocated.length > 0
      ? `\n⚠️ PASSEIOS QUE NAO COUBERAM NO ROTEIRO (avisar cliente no inicio):\n${unallocated.map(n => `- ${n}`).join("\n")}`
      : ""

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

    // Build hotel pricing string based on room configuration
    const hotelQuartos = (answers.hotel_quartos || {}) as Record<string, number>
    const qtdIndividual = hotelQuartos.individual || 0
    const qtdDuplo = hotelQuartos.duplo || 0
    const qtdTriplo = hotelQuartos.triplo || 0
    const roomTypeLabels: Record<string, string> = { individual: "Individual", duplo: "Duplo", triplo: "Triplo" }

    // Build a map for quick price lookup: city_id -> hotel_style_id -> room_type -> price
    const priceMap: Record<string, Record<string, Record<string, { price: number; note: string }>>> = {}
    for (const h of hotelPrices) {
      if (!priceMap[h.city_id]) priceMap[h.city_id] = {}
      if (!priceMap[h.city_id][h.hotel_style_id]) priceMap[h.city_id][h.hotel_style_id] = {}
      priceMap[h.city_id][h.hotel_style_id][h.room_type] = { price: Number(h.price_per_night), note: h.season_note || "" }
    }

    // Build detailed hotel pricing string for the selected room types
    const hotelPricingLines: string[] = []
    const hotelEstrelas = answers.hotel_estrelas || "4"
    const cidadesDoRoteiro = Object.keys(cidadesObj)

    // Summary of room configuration
    const quartosResumo: string[] = []
    if (qtdIndividual > 0) quartosResumo.push(`${qtdIndividual} individual${qtdIndividual > 1 ? "is" : ""}`)
    if (qtdDuplo > 0) quartosResumo.push(`${qtdDuplo} duplo${qtdDuplo > 1 ? "s" : ""}`)
    if (qtdTriplo > 0) quartosResumo.push(`${qtdTriplo} triplo${qtdTriplo > 1 ? "s" : ""}`)
    const quartosResumoStr = quartosResumo.join(" + ")

    for (const cityId of cidadesDoRoteiro) {
      if (cityId === "outro") continue
      const cityName = citiesMap[cityId] || cityId
      const cityPrices = priceMap[cityId]
      if (!cityPrices || !cityPrices[hotelEstrelas]) continue

      const noites = Number(cidadesObj[cityId]) || 0
      const lineParts: string[] = []

      for (const [roomType, qtd] of [["individual", qtdIndividual], ["duplo", qtdDuplo], ["triplo", qtdTriplo]] as [string, number][]) {
        if (qtd <= 0) continue
        const priceData = cityPrices[hotelEstrelas]?.[roomType]
        if (!priceData) {
          lineParts.push(`${roomTypeLabels[roomType]}: NAO DISPONIVEL`)
          continue
        }
        const custoPorNoite = priceData.price * qtd
        const custoTotal = custoPorNoite * noites
        const pessoasNoQuarto = roomType === "individual" ? 1 : roomType === "duplo" ? 2 : 3
        lineParts.push(`${qtd}x ${roomTypeLabels[roomType]} (${pessoasNoQuarto}p): R$${priceData.price}/pessoa/noite x ${qtd} quartos x ${noites} noites = R$${custoTotal}`)
      }

      const seasonNote = cityPrices[hotelEstrelas]?.["duplo"]?.note || ""
      hotelPricingLines.push(`- ${cityName} ${hotelEstrelas}★ (${noites} noites): ${lineParts.join(" | ")}${seasonNote ? ` [${seasonNote}]` : ""}`)
    }
    const hotelPricingStr = hotelPricingLines.join("\n")

    // Hotel string (must be after quartosResumoStr)
    const hotelStr = answers.hotel_estrelas
      ? `${answers.hotel_estrelas} estrelas (${quartosResumoStr})`
      : "nao informado"

    // --- Generate Pre-Roteiro in code (deterministic, not AI-dependent) ---
    const preRoteiro: string[] = []

    // Add warning for unallocated tours
    if (unallocated.length > 0) {
      for (const name of unallocated) {
        const tour = tourAllocations.find(ta => ta.nome === name)
        const reason = tour && tour.diasPossiveis.length === 0
          ? "nao ha dias disponiveis com a combinacao de cidade/disponibilidade/tipo"
          : "nao houve dia livre compativel no roteiro"
        preRoteiro.push(`\u26A0\uFE0F Aviso: ${name} nao foi incluido porque ${reason}.`)
      }
      preRoteiro.push("")
    }

    // Generate each day
    if (tripStart && totalDays > 0) {
      // Determine which day the city changes happen
      let currentCity = citySchedule[0]

      for (let i = 0; i < totalDays; i++) {
        const d = new Date(tripStart.getTime() + i * 86400000)
        const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        const diaSemana = getDiaSemana(d)
        const cityOnDay = citySchedule[i]
        const cityName = citiesMap[cityOnDay] || cityOnDay
        const assigned = dayAssignments.get(i) || []
        const isArrival = i === 0
        const isDeparture = i === totalDays - 1

        // Check if city changed from previous day
        const prevCity = i > 0 ? citySchedule[i - 1] : cityOnDay
        const cityChanged = cityOnDay !== prevCity

        preRoteiro.push(`### Dia ${i + 1} - ${dateStr} (${diaSemana}) - ${cityName}`)

        if (isArrival) {
          preRoteiro.push(`- \u2708\uFE0F Chegada em ${cityName}`)
          preRoteiro.push(`- \uD83D\uDE97 Transfer aeroporto \u2192 hotel`)
          preRoteiro.push(`- \uD83D\uDECE\uFE0F Check-in no hotel`)
          // Check for noturno tour on arrival
          for (const tourName of assigned) {
            const ta = tourAllocations.find(t => t.nome === tourName)
            if (ta) {
              preRoteiro.push(`- \uD83C\uDFAB ${ta.nome} (${ta.saida} - ${ta.retorno}) ${ta.link}`)
            }
          }
          if (assigned.length === 0) {
            preRoteiro.push(`- \uD83C\uDF19 Noite livre`)
          }
        } else if (isDeparture) {
          preRoteiro.push(`- \uD83E\uDDF3 Check-out do hotel`)
          preRoteiro.push(`- \uD83D\uDE97 Transfer hotel \u2192 aeroporto`)
          preRoteiro.push(`- \uD83D\uDEEB Partida`)
        } else {
          // Check if we need check-out/transfer to new city
          if (cityChanged) {
            const prevCityName = citiesMap[prevCity] || prevCity
            preRoteiro.push(`- \uD83E\uDDF3 Check-out do hotel em ${prevCityName}`)
          }

          if (assigned.length > 0) {
            for (const tourName of assigned) {
              const ta = tourAllocations.find(t => t.nome === tourName)
              if (ta) {
                preRoteiro.push(`- \uD83C\uDFAB ${ta.nome} (${ta.saida} - ${ta.retorno}) ${ta.link}`)
              }
            }
          } else {
            preRoteiro.push(`- \uD83C\uDF19 Dia livre`)
          }

          if (cityChanged && !assigned.some(n => n.toLowerCase().includes("city tour punta") || n.toLowerCase().includes("city tour colonia"))) {
            // Need a transfer between cities
            preRoteiro.push(`- \uD83D\uDE97 Transfer ${citiesMap[prevCity] || prevCity} \u2192 ${cityName}`)
          }

          if (cityChanged) {
            preRoteiro.push(`- \uD83C\uDFE8 Check-in no hotel em ${cityName}`)
          }
        }

        preRoteiro.push("")
        currentCity = cityOnDay
      }
    }

    const preRoteiroText = preRoteiro.join("\n")

    // --- Build the prompt: AI only generates the budget section ---
    const prompt = `O Pre-Roteiro abaixo ja foi gerado pelo sistema. Sua tarefa e APENAS gerar o "Pre-Orcamento Estimado" com base nos dados abaixo. Retorne o Pre-Roteiro INTACTO (copie exatamente) seguido do Pre-Orcamento que voce calcular.

## Pre-Roteiro

${preRoteiroText}

---

DADOS PARA CALCULO DO ORCAMENTO:
- ${total} pessoas (${answers.adultos || 1} adultos, ${answers.criancas || 0} criancas)
- Orcamento desejado pelo cliente: ${answers.orcamento || "flexivel"}

PASSEIOS INCLUIDOS NO ROTEIRO (valores por pessoa):
${tourAllocations.filter(ta => !unallocated.includes(ta.nome)).map(ta => `- ${ta.nome}: R$${ta.preco}/pessoa (${ta.link})`).join("\n")}

TRANSFERS NECESSARIOS (valores por grupo):
${transfersStr}

HOSPEDAGEM (valores APROXIMADOS por pessoa/noite):
Configuracao de quartos: ${quartosResumoStr} (${total} pessoas)
${hotelPricingStr}
Cidades e noites: ${cidadesStr}
Hotel selecionado: ${hotelStr}

INSTRUCOES PARA O ORCAMENTO:
1. Copie o Pre-Roteiro acima EXATAMENTE como esta (incluindo avisos de passeios nao incluidos)
2. Adicione "## Pre-Orcamento Estimado" depois do Pre-Roteiro
3. Liste passeios com emoji 🎫, transfers com 🚗, hospedagem com 🏨
4. Calcule TOTAL POR PESSOA e TOTAL DO GRUPO com emoji 💰
5. Valores de hospedagem sao APROXIMADOS — mencione isso
6. Se o total extrapolar o orcamento do cliente, avise com ⚠️ e sugira ajustes
7. Use o valor de transfer correto da tabela para o numero de pessoas do grupo
8. Para hospedagem, use os valores EXATOS da tabela acima (ja calculados por tipo de quarto). NAO recalcule - apenas copie os totais.
9. Detalhe no orcamento a configuracao dos quartos (ex: "2 quartos duplos + 1 individual")`

    // DEBUG: log the suggested schedule
    console.log("[GENERATE] Suggested schedule:\n" + suggestedScheduleStr)
    if (unallocated.length > 0) console.log("[GENERATE] Unallocated:", unallocated.join(", "))

    // --- Build system prompt: minimal, focused on formatting only ---
    const systemPrompt = `Voce e um formatador de roteiros de viagem ao Uruguai para a agencia "Brasileiros no Uruguai" (BNU).

SEU TRABALHO: Receber um roteiro pre-montado pelo sistema e formata-lo de forma bonita em markdown para o cliente.

REGRAS DE FORMATACAO:
- Use emojis nos bullets: ✈️ chegada, 🚗 transfer, 🏨 hotel/check-in, 🧳 check-out, 🛫 partida, 🎫 passeio, 🌙 noite livre
- NAO use negrito no Pre-Roteiro (pode usar no orcamento para totais)
- Responda em portugues, sem travessao
- Valores de hospedagem sao SEMPRE aproximados — indique isso
- NUNCA sugira hoteis especificos (responsabilidade da Consultora)
- Inclua os links dos passeios
- NUNCA altere a distribuicao de passeios nos dias — o sistema ja calculou
- NUNCA invente passeios, atividades ou restaurantes que nao estejam listados
- Se ha aviso de passeios que nao couberam, coloque no INICIO do roteiro`

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
