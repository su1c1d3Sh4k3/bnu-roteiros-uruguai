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
    const [toursRes, citiesRes, profilesRes, transfersRes, hotelPricesRes, combosRes, seasonalRes] = await Promise.all([
      supabase.from("tours").select("*").eq("ativo", true).order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("travel_profiles").select("*").order("sort_order"),
      supabase.from("transfers").select("*").eq("ativo", true).order("sort_order"),
      supabase.from("hotel_prices").select("*"),
      supabase.from("combos").select("*").eq("ativo", true),
      supabase.from("seasonal_rules").select("*").eq("ativo", true),
    ])

    const tours = toursRes.data || []
    const cities = citiesRes.data || []
    const allCombos = combosRes.data || []
    const profiles = profilesRes.data || []
    const transfers = transfersRes.data || []
    const hotelPrices = hotelPricesRes.data || []
    const seasonalRules = seasonalRes.data || []

    // --- Build data maps ---
    const total = (answers.adultos || 1) + (answers.criancas || 0)

    const citiesMap: Record<string, string> = {}
    for (const c of cities) {
      citiesMap[c.id] = c.nome
    }

    let cidadesObj = (answers.cidades || {}) as Record<string, number>

    // ═══════ REGRAS PARA HOSPEDAGEM EM MÚLTIPLOS DESTINOS ═══════
    const selectedCityIds = Object.keys(cidadesObj)
    const hasThreeCities = selectedCityIds.includes("mvd") && selectedCityIds.includes("pde") && selectedCityIds.includes("col")
    const hasMvdPde = selectedCityIds.includes("mvd") && selectedCityIds.includes("pde") && !selectedCityIds.includes("col")
    const multiDestWarnings: string[] = []

    if (hasThreeCities) {
      // 3 cidades: ordem obrigatória Punta → Montevideo → Colonia
      const reordered: Record<string, number> = {}
      reordered["pde"] = cidadesObj["pde"]
      reordered["mvd"] = cidadesObj["mvd"]
      reordered["col"] = cidadesObj["col"]
      for (const [k, v] of Object.entries(cidadesObj)) {
        if (!(k in reordered)) reordered[k] = v as number
      }
      cidadesObj = reordered
    } else if (hasMvdPde) {
      // 2 cidades MVD+PDE: ordem obrigatória Montevideo → Punta
      const reordered: Record<string, number> = {}
      reordered["mvd"] = cidadesObj["mvd"]
      reordered["pde"] = cidadesObj["pde"]
      for (const [k, v] of Object.entries(cidadesObj)) {
        if (!(k in reordered)) reordered[k] = v as number
      }
      cidadesObj = reordered
    }

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
    let passeiosIds: string[] = answers.passeios || []

    // ═══════ FILTRAR PASSEIOS COM BASE NAS REGRAS MULTI-DESTINO ═══════
    const cidadesOrdemIds = Object.keys(cidadesObj)
    const firstCity = cidadesOrdemIds[0] || ""

    // PONTO 9/8: Não oferecer City Tour de cidade já visitada
    const pdeIdx = cidadesOrdemIds.indexOf("pde")
    const mvdIdx = cidadesOrdemIds.indexOf("mvd")
    const colIdx = cidadesOrdemIds.indexOf("col")
    if (pdeIdx >= 0 && mvdIdx >= 0 && pdeIdx < mvdIdx && passeiosIds.includes("city_pde")) {
      passeiosIds = passeiosIds.filter(id => id !== "city_pde")
      // Mensagem específica para 3 cidades (regra original do cliente)
      if (hasThreeCities) {
        multiDestWarnings.push("O City Tour Punta del Este foi removido do roteiro. Este passeio tem saída de Montevideo e como você estará hospedado em Punta del Este, o ideal é fazer o Day Tour de Punta del Este, que sai da própria cidade.")
      } else {
        multiDestWarnings.push("O City Tour Punta del Este foi removido do roteiro. Você já estará hospedado em Punta del Este antes de Montevideo, então já conhecerá a cidade.")
      }
    }
    if (colIdx >= 0 && mvdIdx >= 0 && colIdx < mvdIdx && passeiosIds.includes("city_col")) {
      passeiosIds = passeiosIds.filter(id => id !== "city_col")
      multiDestWarnings.push("O City Tour Colonia del Sacramento foi removido do roteiro. Você já estará hospedado em Colonia del Sacramento antes de Montevideo, então já conhecerá a cidade.")
    }

    if (hasThreeCities) {
      // Sugerir Day Tour Punta se não selecionado e PDE é primeira cidade
      if (!passeiosIds.includes("daytour_pde") && firstCity === "pde") {
        multiDestWarnings.push("Sugestão: como você estará hospedado em Punta del Este, recomendamos incluir o Day Tour de Punta del Este (R$370/pessoa) para conhecer o melhor da cidade, incluindo o pôr do sol na Casapueblo.")
      }
      // Garantir City Tour Colonia como transporte MVD → COL (se não foi removido por regra de cidade já visitada)
      if (!passeiosIds.includes("city_col") && mvdIdx >= 0 && colIdx >= 0 && mvdIdx < colIdx) {
        passeiosIds.push("city_col")
        multiDestWarnings.push("O City Tour Colonia del Sacramento foi adicionado ao roteiro como meio de deslocamento de Montevideo para Colonia del Sacramento (mais econômico que transfer privativo).")
      }
    } else if (hasMvdPde) {
      // Remover Day Tour Punta (similar ao City Tour Punta usado como transporte)
      if (passeiosIds.includes("daytour_pde")) {
        passeiosIds = passeiosIds.filter(id => id !== "daytour_pde")
        multiDestWarnings.push("O Day Tour Punta del Este foi removido do roteiro pois o itinerário é similar ao City Tour Punta del Este, que será utilizado como deslocamento de Montevideo para Punta del Este. Se deseja incluir o Day Tour mesmo assim (para ver o pôr do sol na Casapueblo), entre em contato — incluiremos ambos os passeios, já que o custo do City Tour é menor que o do transfer privativo.")
      }
      // Garantir City Tour Punta como transporte MVD → PDE
      if (!passeiosIds.includes("city_pde")) {
        passeiosIds.push("city_pde")
        multiDestWarnings.push("O City Tour Punta del Este foi adicionado ao roteiro como meio de deslocamento de Montevideo para Punta del Este (mais econômico que transfer privativo).")
      }
    }

    // PONTO 7: Day Tour PDE só se PDE é a primeira cidade (chegada direta)
    // Roda DEPOIS dos blocos específicos (hasThreeCities/hasMvdPde) para não sobrepor mensagens
    if (passeiosIds.includes("daytour_pde") && firstCity !== "pde") {
      passeiosIds = passeiosIds.filter(id => id !== "daytour_pde")
      multiDestWarnings.push("O Day Tour Punta del Este foi removido do roteiro. Este passeio é indicado apenas para quem vai direto para Punta del Este no dia da chegada ao Uruguai.")
    }

    // Pre-calculate which days each tour can be scheduled on
    // Build city schedule: which city is the client in on each day
    const citySchedule: string[] = [] // city_id per day
    if (totalDays > 0) {
      const cidadesOrdem = Object.entries(cidadesObj)
      let dayIdx = 0
      for (const [cityId, nights] of cidadesOrdem) {
        // Each city gets exactly N entries (N nights selected)
        for (let n = 0; n < (nights as number); n++) {
          if (dayIdx < totalDays) {
            citySchedule.push(cityId)
            dayIdx++
          }
        }
      }
      // Fill remaining day (departure day goes to last city)
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
      if (totalDays > 0) {
        for (let i = 0; i < totalDays; i++) {
          const isArrival = i === 0
          const isDeparture = i === totalDays - 1
          const cityOnDay = citySchedule[i] || ""
          const tipo = (t.tipo_passeio || "Diurno")

          if (isDeparture) continue
          if (isArrival && tipo !== "Noturno") continue
          if (cityOnDay !== t.cidade_base) continue

          // Só filtrar por dia da semana se temos datas reais
          if (tripStart) {
            const d = new Date(tripStart.getTime() + i * 86400000)
            const diaSemana = getDiaSemana(d)
            if (!isDayAvailable(diaSemana, t.disponibilidade || "todos os dias")) continue
          }

          // PONTO 5: Em dias de mudança de cidade (transfer), só permitir Noturno
          // (exceto se este tour É o tour de transporte designado)
          const isCityChangeDay = i > 0 && citySchedule[i] !== citySchedule[i - 1]
          if (isCityChangeDay && tipo !== "Noturno") continue

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

    // ═══════ RESTRINGIR TOUR DE TRANSPORTE AO DIA DE TRANSIÇÃO ═══════
    let transportTourId: string | null = null
    let transportTransitionDay = -1

    if ((hasThreeCities || hasMvdPde) && tripStart && totalDays > 0) {
      const transSourceCity = "mvd"
      const transDestCity = hasThreeCities ? "col" : "pde"
      transportTourId = hasThreeCities ? "city_col" : "city_pde"

      // Encontrar o último dia na cidade de origem antes da cidade de destino
      for (let i = 1; i < citySchedule.length; i++) {
        if (citySchedule[i - 1] === transSourceCity && citySchedule[i] === transDestCity) {
          transportTransitionDay = i - 1
          break
        }
      }

      // Restringir diasPossiveis do tour de transporte ao dia de transição
      // PONTO 3: Se o dia exato não funciona, tentar o último dia disponível em MVD
      if (transportTransitionDay >= 0) {
        for (const ta of tourAllocations) {
          if (ta.id === transportTourId) {
            // Primeiro tentar o dia de transição exato
            const exactDay = ta.diasPossiveis.filter(d => d === transportTransitionDay)

            if (exactDay.length > 0) {
              ta.diasPossiveis = exactDay
            } else {
              // Dia exato não disponível — procurar o último dia disponível em MVD antes da transição
              const fallbackDays = ta.diasPossiveis.filter(d => d <= transportTransitionDay && citySchedule[d] === transSourceCity)
              if (fallbackDays.length > 0) {
                const bestDay = fallbackDays[fallbackDays.length - 1] // último dia disponível
                ta.diasPossiveis = [bestDay]
                // Ajustar citySchedule: mover noites de MVD para COL
                // Do bestDay+1 até transportTransitionDay, trocar de MVD para COL
                for (let adj = bestDay + 1; adj <= transportTransitionDay; adj++) {
                  if (citySchedule[adj] === transSourceCity) {
                    citySchedule[adj] = transDestCity
                  }
                }
                transportTransitionDay = bestDay
                const bestDate = new Date(tripStart.getTime() + bestDay * 86400000)
                const bestDateStr = `${String(bestDate.getDate()).padStart(2, "0")}/${String(bestDate.getMonth() + 1).padStart(2, "0")}`
                const bestDiaSemana = getDiaSemana(bestDate)
                multiDestWarnings.push(`O City Tour Colonia del Sacramento foi agendado em ${bestDateStr} (${bestDiaSemana}) para coincidir com um dia disponível. As noites foram redistribuídas automaticamente entre Montevideo e Colonia del Sacramento.`)
              } else {
                // Nenhum dia disponível em MVD — fallback com transfer regular
                ta.diasPossiveis = []
                const transDate = new Date(tripStart.getTime() + transportTransitionDay * 86400000)
                const diaSemana = getDiaSemana(transDate)
                const dateStr = `${String(transDate.getDate()).padStart(2, "0")}/${String(transDate.getMonth() + 1).padStart(2, "0")}`
                if (ta.id === "city_col") {
                  multiDestWarnings.push(`O City Tour Colonia del Sacramento (deslocamento Montevideo → Colonia) acontece apenas às terças, quintas e sábados. Nenhum dia de Montevideo no roteiro coincide com esses dias. Sugerimos ajustar as datas da viagem ou utilizar transfer privativo.`)
                }
              }
            }
          }
        }
      }
    }

    // Após ajuste de citySchedule (Ponto 3), revalidar diasPossiveis de todos os tours
    // pois dias que eram MVD podem ter virado COL, e city change days podem ter mudado
    if (tripStart && totalDays > 0) {
      for (const ta of tourAllocations) {
        if (ta.id === transportTourId) continue // transport já foi restringido
        const t = toursMap[ta.id]
        if (!t) continue
        const tipo = t.tipo_passeio || "Diurno"
        ta.diasPossiveis = ta.diasPossiveis.filter(d => {
          const cityOnDay = citySchedule[d] || ""
          if (cityOnDay !== t.cidade_base) return false
          // Revalidar regra Ponto 5: sem diurno em dia de mudança de cidade
          if (d > 0 && citySchedule[d] !== citySchedule[d - 1] && tipo !== "Noturno") return false
          return true
        })
      }
    }

    // Recalcular cidadesObj a partir do citySchedule real (após ajustes de fallback)
    // Cada dia exceto o último (departure) = 1 noite na cidade daquele dia
    if (citySchedule.length > 1) {
      const realNights: Record<string, number> = {}
      for (let i = 0; i < citySchedule.length - 1; i++) {
        const c = citySchedule[i]
        realNights[c] = (realNights[c] || 0) + 1
      }
      // Atualizar cidadesObj mantendo a ordem
      for (const cityId of Object.keys(cidadesObj)) {
        if (realNights[cityId] !== undefined) {
          cidadesObj[cityId] = realNights[cityId]
        }
      }
    }

    // Sort by fewest options first (constraint propagation)
    tourAllocations.sort((a, b) => a.diasPossiveis.length - b.diasPossiveis.length)

    // Generate a suggested allocation (greedy by constraint)
    const dayAssignments: Map<number, string[]> = new Map() // day -> tour names
    const unallocated: string[] = []

    // Pré-alocar tour de transporte (prioridade máxima)
    const preAssigned = new Set<string>()
    if (transportTourId) {
      const transportTour = tourAllocations.find(ta => ta.id === transportTourId)
      if (transportTour && transportTour.diasPossiveis.length > 0) {
        const day = transportTour.diasPossiveis[0]
        dayAssignments.set(day, [transportTour.nome])
        preAssigned.add(transportTour.nome)
      }
    }

    for (const tour of tourAllocations) {
      if (preAssigned.has(tour.nome)) continue
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

    // Pós-validação defensiva: "Dia Todo" nunca combina com outro passeio no mesmo dia
    for (const [dayIdx, names] of dayAssignments.entries()) {
      if (names.length <= 1) continue
      const dayTours = names.map(n => tourAllocations.find(ta => ta.nome === n))
      const hasDiaTodo = dayTours.some(t => t?.tipo === "Dia Todo")
      if (hasDiaTodo) {
        // Manter apenas o tour "Dia Todo", desalocar os outros
        const diaTodoName = dayTours.find(t => t?.tipo === "Dia Todo")!.nome
        const removed = names.filter(n => n !== diaTodoName)
        dayAssignments.set(dayIdx, [diaTodoName])
        for (const r of removed) unallocated.push(r)
      }
    }

    // Pós-validação defensiva: verificar disponibilidade (dia da semana) de cada tour alocado
    if (tripStart) {
      for (const [dayIdx, names] of dayAssignments.entries()) {
        const d = new Date(tripStart.getTime() + dayIdx * 86400000)
        const diaSemana = getDiaSemana(d)
        const invalid = names.filter(name => {
          const ta = tourAllocations.find(t => t.nome === name)
          if (!ta) return false
          const t = toursMap[ta.id]
          if (!t) return false
          return !isDayAvailable(diaSemana, t.disponibilidade || "todos os dias")
        })
        if (invalid.length > 0) {
          dayAssignments.set(dayIdx, names.filter(n => !invalid.includes(n)))
          for (const r of invalid) unallocated.push(r)
        }
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

    // Sazonalidade: determinar meses da viagem e calcular multiplicador por cidade
    const tripMonths = new Set<number>()
    if (tripStart && tripEnd) {
      const cur = new Date(tripStart.getTime())
      while (cur <= tripEnd) {
        tripMonths.add(cur.getMonth() + 1) // 1-12
        cur.setDate(cur.getDate() + 1)
      }
    }

    // Para cada cidade, encontrar o maior percentual sazonal aplicavel
    const getSeasonMultiplier = (cityId: string): number => {
      let maxPct = 0
      for (const rule of seasonalRules) {
        if (rule.city_id !== cityId) continue
        if (rule.months.some((m: number) => tripMonths.has(m))) {
          if (rule.percentage > maxPct) maxPct = rule.percentage
        }
      }
      return maxPct > 0 ? 1 + maxPct / 100 : 1
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
      const mult = getSeasonMultiplier(cityId)
      const lineParts: string[] = []

      for (const [roomType, qtd] of [["individual", qtdIndividual], ["duplo", qtdDuplo], ["triplo", qtdTriplo]] as [string, number][]) {
        if (qtd <= 0) continue
        const priceData = cityPrices[hotelEstrelas]?.[roomType]
        if (!priceData) {
          lineParts.push(`${roomTypeLabels[roomType]}: NAO DISPONIVEL`)
          continue
        }
        const adjustedPrice = Math.round(priceData.price * mult)
        const custoPorNoite = adjustedPrice * qtd
        const custoTotal = custoPorNoite * noites
        const pessoasNoQuarto = roomType === "individual" ? 1 : roomType === "duplo" ? 2 : 3
        lineParts.push(`${qtd}x ${roomTypeLabels[roomType]} (${pessoasNoQuarto}p): R$${adjustedPrice}/pessoa/noite x ${qtd} quartos x ${noites} noites = R$${custoTotal}`)
      }

      hotelPricingLines.push(`- ${cityName} ${hotelEstrelas}\u2605 (${noites} noites): ${lineParts.join(" | ")}`)
    }
    const hotelPricingStr = hotelPricingLines.join("\n")

    // Hotel string (must be after quartosResumoStr)
    const hotelStr = answers.hotel_estrelas
      ? `${answers.hotel_estrelas} estrelas (${quartosResumoStr})`
      : "nao informado"

    // --- Generate Pre-Roteiro in code (deterministic, not AI-dependent) ---
    const preRoteiro: string[] = []

    // Add multi-destination warnings
    if (multiDestWarnings.length > 0) {
      for (const warning of multiDestWarnings) {
        preRoteiro.push(`\u26A0\uFE0F ${warning}`)
      }
      preRoteiro.push("")
    }

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
    if (totalDays > 0) {
      let currentCity = citySchedule[0]
      let prevWasTransportTour = false

      for (let i = 0; i < totalDays; i++) {
        const cityOnDay = citySchedule[i]
        const cityName = citiesMap[cityOnDay] || cityOnDay
        const assigned = dayAssignments.get(i) || []
        const isArrival = i === 0
        const isDeparture = i === totalDays - 1

        // Check if city changed from previous day
        const prevCity = i > 0 ? citySchedule[i - 1] : cityOnDay
        const cityChanged = cityOnDay !== prevCity

        // Detect transport tour on this day
        const nextCity = (i + 1 < totalDays) ? citySchedule[i + 1] : null
        const isTransportTourDay = transportTourId !== null && assigned.some(name => {
          const ta = tourAllocations.find(t => t.nome === name)
          return ta && ta.id === transportTourId
        }) && nextCity && nextCity !== cityOnDay
        const transportDestCityName = isTransportTourDay ? (citiesMap[nextCity!] || nextCity) : null

        // Detect failed transport (tour expected but not allocated — need fallback transfer)
        const isFailedTransportDay = !isTransportTourDay && i === transportTransitionDay &&
          transportTourId !== null && nextCity !== null && nextCity !== cityOnDay

        // Suppress city change if yesterday had transport (successful or fallback)
        const suppressCityChange = cityChanged && prevWasTransportTour

        // Build day header with or without dates
        if (tripStart) {
          const d = new Date(tripStart.getTime() + i * 86400000)
          const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
          const diaSemana = getDiaSemana(d)
          preRoteiro.push(`### Dia ${i + 1} - ${dateStr} (${diaSemana}) - ${cityName}`)
        } else {
          preRoteiro.push(`### Dia ${i + 1} - ${cityName}`)
        }

        // PONTO 1: Van compartilhada só para 1 pessoa no trecho Aeroporto MVD ↔ Hotel MVD
        const isAirportMvdTransfer = (isArrival && !(hasThreeCities && cityOnDay === "pde")) || (isDeparture && !((hasThreeCities && cityOnDay === "col") || (hasMvdPde && cityOnDay === "pde")))
        const transferLabel = (total === 1 && isAirportMvdTransfer) ? "Van compartilhada" : "Transfer"

        if (isArrival) {
          // Arrival: handle non-MVD first city (3-city scenario starts in PDE)
          if (hasThreeCities && cityOnDay === "pde") {
            preRoteiro.push(`- \u2708\uFE0F Chegada no Aeroporto de Montevideo`)
            preRoteiro.push(`- \uD83D\uDE97 Transfer Aeroporto de Montevideo \u2192 hotel em ${cityName}`)
          } else {
            preRoteiro.push(`- \u2708\uFE0F Chegada em ${cityName}`)
            preRoteiro.push(`- \uD83D\uDE97 ${transferLabel} aeroporto \u2192 hotel`)
          }
          preRoteiro.push(`- \uD83D\uDECE\uFE0F Check-in no hotel`)
          for (const tourName of assigned) {
            const ta = tourAllocations.find(t => t.nome === tourName)
            if (ta) {
              const dispInfo = (!tripStart && ta.disponibilidade && ta.disponibilidade.toLowerCase() !== "todos os dias") ? ` (disponivel: ${ta.disponibilidade})` : ""
              preRoteiro.push(`- \uD83C\uDFAB ${ta.nome} (${ta.saida} - ${ta.retorno})${dispInfo} ${ta.link}`)
            }
          }
          if (assigned.length === 0) {
            preRoteiro.push(`- \uD83C\uDF19 Noite livre`)
          }
        } else if (isDeparture) {
          // Departure: handle non-MVD last city
          preRoteiro.push(`- \uD83E\uDDF3 Check-out do hotel${cityOnDay !== "mvd" ? " em " + cityName : ""}`)
          if ((hasThreeCities && cityOnDay === "col") || (hasMvdPde && cityOnDay === "pde")) {
            preRoteiro.push(`- \uD83D\uDE97 Transfer ${cityName} \u2192 Aeroporto de Montevideo`)
          } else {
            preRoteiro.push(`- \uD83D\uDE97 ${transferLabel} hotel \u2192 aeroporto`)
          }
          preRoteiro.push(`- \uD83D\uDEEB Partida`)
        } else {
          // ── City change: check-out, transfer, check-in (BEFORE tours) ──
          if (cityChanged && !suppressCityChange) {
            const prevCityName = citiesMap[prevCity] || prevCity
            preRoteiro.push(`- \uD83E\uDDF3 Check-out do hotel em ${prevCityName}`)

            // Regular transfer (not handled by transport tour or city tour)
            if (!isTransportTourDay) {
              const hasCityTourTransfer = assigned.some(n => n.toLowerCase().includes("city tour punta") || n.toLowerCase().includes("city tour colonia"))
              if (!hasCityTourTransfer) {
                preRoteiro.push(`- \uD83D\uDE97 Transfer ${prevCityName} \u2192 ${cityName}`)
              }
            }

            preRoteiro.push(`- \uD83C\uDFE8 Check-in no hotel em ${cityName}`)
          }

          // ── Transport tour day: check-out from current city ──
          if (isTransportTourDay && !cityChanged) {
            preRoteiro.push(`- \uD83E\uDDF3 Check-out do hotel em ${cityName}`)
          }

          // ── Tours ──
          if (assigned.length > 0) {
            for (const tourName of assigned) {
              const ta = tourAllocations.find(t => t.nome === tourName)
              if (ta) {
                const isTransport = isTransportTourDay && ta.id === transportTourId
                const transportLabel = isTransport ? ` \u2014 deslocamento para ${transportDestCityName}` : ""
                const dispInfo = (!tripStart && ta.disponibilidade && ta.disponibilidade.toLowerCase() !== "todos os dias") ? ` (disponivel: ${ta.disponibilidade})` : ""
                preRoteiro.push(`- \uD83C\uDFAB ${ta.nome} (${ta.saida} - ${ta.retorno})${transportLabel}${dispInfo} ${ta.link}`)
              }
            }
          } else if (!isFailedTransportDay) {
            preRoteiro.push(`- \uD83C\uDF19 Dia livre`)
          }

          // ── Transport tour: check-in to destination ──
          if (isTransportTourDay) {
            preRoteiro.push(`- \uD83C\uDFE8 Check-in no hotel em ${transportDestCityName}`)
          }

          // ── Fallback: transport tour failed, add regular transfer ──
          if (isFailedTransportDay) {
            const destCityName = citiesMap[nextCity!] || nextCity
            preRoteiro.push(`- \uD83E\uDDF3 Check-out do hotel em ${cityName}`)
            preRoteiro.push(`- \uD83D\uDE97 Transfer ${cityName} \u2192 ${destCityName}`)
            preRoteiro.push(`- \uD83C\uDFE8 Check-in no hotel em ${destCityName}`)
          }
        }

        preRoteiro.push("")
        prevWasTransportTour = !!isTransportTourDay || isFailedTransportDay
        currentCity = cityOnDay
      }
    }

    const preRoteiroText = preRoteiro.join("\n")

    // --- Build Pre-Orcamento in code (deterministic, no AI errors) ---
    const budget: string[] = []
    const transfersMap: Record<string, typeof transfers[0]> = {}
    for (const t of transfers) transfersMap[t.id] = t

    const getTransferPrice = (tr: typeof transfers[0]): number => {
      if (total <= 2) return Number(tr.price_1_2) || 0
      if (total <= 6) return Number(tr.price_3_6) || 0
      if (total <= 11) return Number(tr.price_7_11) || 0
      return Number(tr.price_12_15) || 0
    }

    // Passeios (com suporte a combo)
    budget.push("## Pre-Orcamento Estimado")
    budget.push("")
    budget.push("### \uD83C\uDFAB Passeios")
    const allocatedTours = tourAllocations.filter(ta => !unallocated.includes(ta.nome))
    let totalPasseios = 0

    // Verificar se tem combo selecionado
    const comboId = (answers.combo_id || "") as string
    const activeCombo = comboId ? allCombos.find((c: { id: string }) => c.id === comboId) : null
    const comboTourIds = new Set<string>(activeCombo ? (activeCombo.tour_ids as string[]) : [])

    if (activeCombo && comboTourIds.size > 0) {
      // Verificar quantos tours do combo foram efetivamente alocados
      const comboTours = allocatedTours.filter(ta => comboTourIds.has(ta.id))
      const nonComboTours = allocatedTours.filter(ta => !comboTourIds.has(ta.id))
      const allComboTourIds = activeCombo.tour_ids as string[]
      const somaIndividualTotal = allComboTourIds.reduce((s: number, id: string) => {
        const t = toursMap[id]
        return s + (t ? Number(t.valor_por_pessoa) : 0)
      }, 0)
      const comboPreco = Number(activeCombo.preco_combo)

      // Só aplicar combo se TODOS os tours foram alocados
      if (comboTours.length === allComboTourIds.length) {
        const custoCombo = comboPreco * total
        totalPasseios += custoCombo
        const economiaTotal = (somaIndividualTotal - comboPreco) * total
        const descontoPct = somaIndividualTotal > 0 ? Math.round((1 - comboPreco / somaIndividualTotal) * 100) : 0

        budget.push(`- \uD83C\uDFC6 ${activeCombo.nome}: R$${comboPreco}/pessoa x ${total} = R$${custoCombo}`)
        for (const ta of comboTours) {
          const nota = (ta.id === transportTourId) ? " (inclui deslocamento)" : ""
          const linkStr = (ta.link && ta.link !== "N/A") ? ` ${ta.link}` : ""
          budget.push(`  - ${ta.nome} (R$${ta.preco} individual)${nota}${linkStr}`)
        }
        budget.push(`  Economia: R$${economiaTotal} (${descontoPct}% de desconto)`)
      } else {
        // Combo incompleto: cobrar individualmente e avisar
        budget.push(`- \u26A0\uFE0F ${activeCombo.nome}: combo nao aplicado (nem todos os passeios couberam no roteiro)`)
        for (const ta of comboTours) {
          const custo = ta.preco * total
          totalPasseios += custo
          const nota = (ta.id === transportTourId) ? " (inclui deslocamento entre cidades)" : ""
          const linkStr = (ta.link && ta.link !== "N/A") ? ` ${ta.link}` : ""
          budget.push(`- ${ta.nome}: R$${ta.preco}/pessoa x ${total} = R$${custo}${nota}${linkStr}`)
        }
      }

      // Tours fora do combo
      for (const ta of nonComboTours) {
        const custo = ta.preco * total
        totalPasseios += custo
        const nota = (ta.id === transportTourId) ? " (inclui deslocamento entre cidades)" : ""
        const linkStr = (ta.link && ta.link !== "N/A") ? ` ${ta.link}` : ""
        budget.push(`- ${ta.nome}: R$${ta.preco}/pessoa x ${total} = R$${custo}${nota}${linkStr}`)
      }
    } else {
      // Sem combo: listar individual
      for (const ta of allocatedTours) {
        const custo = ta.preco * total
        totalPasseios += custo
        const nota = (ta.id === transportTourId) ? " (inclui deslocamento entre cidades)" : ""
        const linkStr = (ta.link && ta.link !== "N/A") ? ` ${ta.link}` : ""
        budget.push(`- ${ta.nome}: R$${ta.preco}/pessoa x ${total} = R$${custo}${nota}${linkStr}`)
      }
    }
    if (allocatedTours.length === 0) budget.push("- Nenhum passeio incluido")

    // Transfers
    budget.push("")
    budget.push("### \uD83D\uDE97 Transfers")
    let totalTransfers = 0

    // Chegada
    const arrivalCity = citySchedule[0]
    if (total === 1 && arrivalCity === "mvd" && transfersMap["Aeroporto_solo"]) {
      const p = getTransferPrice(transfersMap["Aeroporto_solo"])
      totalTransfers += p
      budget.push(`- Van compartilhada aeroporto \u2192 hotel: R$${p}`)
    } else if (arrivalCity === "pde" && transfersMap["aeroportomvd_punta"]) {
      const p = getTransferPrice(transfersMap["aeroportomvd_punta"])
      totalTransfers += p
      budget.push(`- Transfer Aeroporto de Montevideo \u2192 Punta del Este: R$${p}`)
    } else if (transfersMap["aeroporto_mvd"]) {
      const p = getTransferPrice(transfersMap["aeroporto_mvd"])
      totalTransfers += p
      budget.push(`- Transfer aeroporto \u2192 hotel: R$${p}`)
    }

    // Transfers entre cidades (só os que NÃO são cobertos por city tour de transporte)
    for (let ti = 1; ti < citySchedule.length; ti++) {
      if (citySchedule[ti] !== citySchedule[ti - 1]) {
        const from = citySchedule[ti - 1]
        const to = citySchedule[ti]
        // Pular se coberto pelo tour de transporte
        if (transportTourId && (ti - 1) === transportTransitionDay) continue
        let trId = ""
        if ((from === "mvd" && to === "pde") || (from === "pde" && to === "mvd")) trId = "mvd_punta"
        else if ((from === "mvd" && to === "col") || (from === "col" && to === "mvd")) trId = "mvd_colonia"
        if (trId && transfersMap[trId]) {
          const p = getTransferPrice(transfersMap[trId])
          totalTransfers += p
          budget.push(`- Transfer ${citiesMap[from] || from} \u2192 ${citiesMap[to] || to}: R$${p}`)
        }
      }
    }

    // Partida
    const departCity = citySchedule[citySchedule.length - 1]
    if (total === 1 && departCity === "mvd" && transfersMap["Aeroporto_solo"]) {
      const p = getTransferPrice(transfersMap["Aeroporto_solo"])
      totalTransfers += p
      budget.push(`- Van compartilhada hotel \u2192 aeroporto: R$${p}`)
    } else if (departCity === "pde" && transfersMap["mvd_punta"]) {
      const p = getTransferPrice(transfersMap["mvd_punta"])
      totalTransfers += p
      budget.push(`- Transfer Punta del Este \u2192 Aeroporto de Montevideo: R$${p}`)
    } else if (departCity === "col" && transfersMap["mvd_colonia"]) {
      const p = getTransferPrice(transfersMap["mvd_colonia"])
      totalTransfers += p
      budget.push(`- Transfer Colonia del Sacramento \u2192 Aeroporto de Montevideo: R$${p}`)
    } else if (transfersMap["aeroporto_mvd"]) {
      const p = getTransferPrice(transfersMap["aeroporto_mvd"])
      totalTransfers += p
      budget.push(`- Transfer hotel \u2192 aeroporto: R$${p}`)
    }

    // Hospedagem
    budget.push("")
    budget.push("### \uD83C\uDFE8 Hospedagem (valores APROXIMADOS)")
    budget.push(`Configuracao de quartos: ${quartosResumoStr}`)
    let totalHospedagem = 0
    for (const cityId of Object.keys(cidadesObj)) {
      if (cityId === "outro") continue
      const cName = citiesMap[cityId] || cityId
      const noites = Number(cidadesObj[cityId]) || 0
      const cp = priceMap[cityId]
      if (!cp || !cp[hotelEstrelas]) continue
      const mult = getSeasonMultiplier(cityId)
      let cityCost = 0
      const parts: string[] = []
      for (const [rt, qtd] of [["individual", qtdIndividual], ["duplo", qtdDuplo], ["triplo", qtdTriplo]] as [string, number][]) {
        if (qtd <= 0) continue
        const pd = cp[hotelEstrelas]?.[rt]
        if (!pd) { parts.push(`${roomTypeLabels[rt]}: N/A`); continue }
        const adjustedPrice = Math.round(pd.price * mult)
        const cost = adjustedPrice * qtd * noites
        cityCost += cost
        parts.push(`${qtd}x ${roomTypeLabels[rt]} R$${adjustedPrice}/noite x ${noites}n = R$${cost}`)
      }
      totalHospedagem += cityCost
      budget.push(`- ${cName} ${hotelEstrelas}\u2605 (${noites} noites): ${parts.join(" + ")}`)
    }

    // Totais
    budget.push("")
    budget.push("---")
    budget.push("")
    const totalGrupo = totalPasseios + totalTransfers + totalHospedagem
    const totalPorPessoa = total > 0 ? Math.round(totalGrupo / total) : totalGrupo
    budget.push("### \uD83D\uDCB0 Resumo")
    budget.push(`- \uD83C\uDFAB Passeios: R$${totalPasseios}`)
    budget.push(`- \uD83D\uDE97 Transfers: R$${totalTransfers}`)
    budget.push(`- \uD83C\uDFE8 Hospedagem (aprox.): R$${totalHospedagem}`)
    budget.push("")
    budget.push(`**Total por pessoa: R$${totalPorPessoa}**`)
    budget.push(`**Total do grupo (${total} pessoas): R$${totalGrupo}**`)
    budget.push("")
    budget.push("_Valores de hospedagem sao aproximados e podem variar conforme disponibilidade, datas e hotel escolhido._")

    // Aviso de orçamento
    const orcamentoCliente = answers.orcamento || ""
    const matchOrc = orcamentoCliente.match(/R\$\s*([\d.]+)/g)
    if (matchOrc && matchOrc.length >= 2) {
      const maxOrc = Number(matchOrc[matchOrc.length - 1].replace(/R\$\s*/, "").replace(/\./g, ""))
      if (maxOrc > 0 && totalPorPessoa > maxOrc) {
        budget.push("")
        budget.push(`\u26A0\uFE0F O valor estimado por pessoa (R$${totalPorPessoa}) esta acima do orcamento desejado (${orcamentoCliente}). Sugerimos ajustar categoria de hotel, numero de noites ou avaliar transfers alternativos.`)
      }
    }

    const budgetText = budget.join("\n")
    let resultText = `## Pre-Roteiro\n\n${preRoteiroText}\n---\n\n${budgetText}`

    // DEBUG
    console.log("[GENERATE] Suggested schedule:\n" + suggestedScheduleStr)
    if (unallocated.length > 0) console.log("[GENERATE] Unallocated:", unallocated.join(", "))

    // ═══════ REFINAMENTO POR IA COM BASE EM "INFORMAÇÕES ADICIONAIS" ═══════
    const extrasText = (answers.extras || "").trim()
    if (extrasText) {
      console.log("[GENERATE] Extras detected, calling AI to refine itinerary:", extrasText.substring(0, 100))

      const openaiKey = Deno.env.get("OPENAI_API_KEY")
      if (openaiKey) {
        try {
          const [itineraryRules] = await Promise.all([getItineraryRules(supabase)])

          // Catálogo de tours e transfers disponíveis para contexto
          const catalogoTours = tours.map(t =>
            `- ${t.nome} (ID: ${t.id}) | Tipo: ${t.tipo_passeio || "Diurno"} | R$${t.valor_por_pessoa}/pessoa | Cidade: ${citiesMap[t.cidade_base] || t.cidade_base} | Horário: ${t.horario_saida || "N/A"} - ${t.horario_retorno || "N/A"} | Disponibilidade: ${t.disponibilidade || "todos os dias"} | Link: ${t.link_url || "N/A"}`
          ).join("\n")

          const catalogoTransfers = transfers.map(t => {
            const prices: string[] = []
            if (t.price_1_2 > 0) prices.push(`1-2 pax: R$${t.price_1_2}`)
            if (t.price_3_6 > 0) prices.push(`3-6 pax: R$${t.price_3_6}`)
            if (t.price_7_11 > 0) prices.push(`7-11 pax: R$${t.price_7_11}`)
            if (t.price_12_15 > 0) prices.push(`12-15 pax: R$${t.price_12_15}`)
            return `- ${t.nome} (ID: ${t.id}): ${prices.join(" | ")}`
          }).join("\n")

          const refinePrompt = `Voce e o Rodrigo, consultor da Brasileiros no Uruguai. O sistema gerou um roteiro automatico para o cliente, mas o cliente deixou observacoes no campo "Informacoes Adicionais". Sua tarefa e analisar o roteiro e as observacoes do cliente e fazer os ajustes necessarios.

${itineraryRules}

DADOS DA VIAGEM:
- Pessoas: ${total} (${answers.adultos || 1} adultos, ${answers.criancas || 0} criancas)
- Cidades: ${cidadesStr}
- Hotel: ${hotelStr}
- Quartos: ${quartosResumoStr}

CATALOGO DE PASSEIOS DISPONIVEIS:
${catalogoTours}

CATALOGO DE TRANSFERS DISPONIVEIS:
${catalogoTransfers}

ROTEIRO GERADO PELO SISTEMA:
${resultText}

INFORMACOES ADICIONAIS DO CLIENTE:
"${extrasText}"

INSTRUCOES:
1. Analise cuidadosamente o que o cliente escreveu em "Informacoes Adicionais".
2. Compare com o roteiro gerado e identifique o que precisa ser adaptado.
3. Exemplos de adaptacoes: trocar tipo de transfer (compartilhado por privativo), adicionar/remover passeios, ajustar horarios, incluir pedidos especiais, etc.
4. Retorne o roteiro COMPLETO atualizado (Pre-Roteiro dia a dia + Pre-Orcamento Estimado).
5. Mantenha EXATAMENTE o mesmo formato markdown do roteiro original (## para secoes, ### para dias, - para bullets com emojis).
6. Recalcule o orcamento se houver mudanca em passeios, transfers ou hospedagem. O total DEVE refletir as mudancas.
7. NAO adicione explicacoes ou comentarios fora do roteiro. Retorne SOMENTE o roteiro completo.
8. Se as observacoes do cliente nao exigem mudanca alguma, retorne o roteiro original sem alteracoes.
9. IMPORTANTE: Use os precos EXATOS do catalogo de tours e transfers fornecido acima. Nao invente precos.
10. TRANSFER PRIVATIVO: quando o cliente pedir transfer privativo para um passeio (ex: "transfer privativo para o City Tour"), use o preco do transfer privativo da cidade correspondente (ex: "Aeroporto de Montevideo" para passeios em Montevideo = R$${getTransferPrice(transfersMap["aeroporto_mvd"] || transfers[0])}/trecho para ${total} pax). INCLUA o valor no orcamento e no total — nao deixe como "sob consulta".
11. NUNCA remova passeios, transfers ou itens do roteiro original a menos que o cliente peca explicitamente.
12. Se o cliente pedir algo que voce nao consegue precificar com o catalogo, inclua no roteiro com a nota "(valor sob consulta)" mas NUNCA omita do roteiro.`

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1",
              max_tokens: 4000,
              messages: [
                { role: "system", content: refinePrompt },
                { role: "user", content: `Por favor, analise as informacoes adicionais do cliente e ajuste o roteiro conforme necessario.` },
              ],
            }),
          })

          if (res.ok) {
            const data = await res.json()
            const refined = data?.choices?.[0]?.message?.content || ""
            // Validar: deve conter estrutura de roteiro
            if (refined && (refined.includes("## Pre-Roteiro") || refined.includes("## Pré-Roteiro") || refined.includes("### Dia"))) {
              console.log("[GENERATE] AI refinement applied successfully, length:", refined.length)
              resultText = refined
            } else {
              console.log("[GENERATE] AI refinement did not pass validation, keeping original. Start:", refined.substring(0, 100))
            }
          } else {
            console.error("[GENERATE] OpenAI API error during refinement:", res.status, await res.text())
          }
        } catch (refineErr) {
          console.error("[GENERATE] Error during AI refinement:", refineErr)
          // Fallback: manter o roteiro original
        }
      } else {
        console.log("[GENERATE] OPENAI_API_KEY not set, skipping extras refinement")
      }
    }

    // --- Save result to DB + sync reordered cities/tours to answers ---
    // Atualizar answers.cidades com a ordem correta para que o Timeline do frontend reflita o roteiro
    const cidadesReordenadas: Record<string, number> = {}
    for (let ci = 0; ci < citySchedule.length; ci++) {
      const cid = citySchedule[ci]
      if (!cidadesReordenadas[cid]) cidadesReordenadas[cid] = 0
    }
    // Contar noites a partir do citySchedule (ignorar arrival day do primeiro)
    const cidadesContadas: Record<string, number> = {}
    const firstCityId = citySchedule[0]
    let counting = false
    for (let ci = 0; ci < citySchedule.length; ci++) {
      const cid = citySchedule[ci]
      if (ci === 0) { counting = true; continue } // skip arrival day
      if (!cidadesContadas[cid]) cidadesContadas[cid] = 0
      cidadesContadas[cid]++
    }
    // Manter ordem do citySchedule
    const cidadesOrdenadas: Record<string, number> = {}
    const seen = new Set<string>()
    for (const cid of citySchedule) {
      if (!seen.has(cid)) {
        cidadesOrdenadas[cid] = cidadesContadas[cid] || cidadesObj[cid] || 1
        seen.add(cid)
      }
    }

    await supabase
      .from("itinerary_answers")
      .update({ cidades: cidadesOrdenadas, passeios: passeiosIds })
      .eq("itinerary_id", itinerary_id)

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
