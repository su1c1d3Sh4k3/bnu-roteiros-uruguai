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

    // --- Fetch itinerary + answers + messages + tours + transfers + combos + hotels + seasonal ---
    const [itinRes, answersRes, messagesRes, toursRes, transfersRes, citiesRes, combosRes, hotelPricesRes, seasonalRes] = await Promise.all([
      supabase.from("itineraries").select("id, generated_result").eq("id", itinerary_id).eq("user_id", userId).single(),
      supabase.from("itinerary_answers").select("nome, email, perfil, adultos, criancas, data_ida, data_volta, dias_total, datas_definidas, cidades, hotel_estrelas, hotel_opcao, hotel_nome, hotel_quartos, passeios, ocasiao_especial, ocasiao_detalhe, ocasiao_data, orcamento, extras, combo_id").eq("itinerary_id", itinerary_id).single(),
      supabase.from("chat_messages").select("role, content").eq("itinerary_id", itinerary_id).order("created_at", { ascending: true }),
      supabase.from("tours").select("id, nome, valor_por_pessoa, cidade_base, duration, link_url, tipo_passeio, disponibilidade, horario_saida, horario_retorno, emoji, private_pricing").eq("ativo", true).order("sort_order"),
      supabase.from("transfers").select("id, nome, price_1_2, price_3_6, price_7_11, price_12_15").eq("ativo", true),
      supabase.from("cities").select("id, nome, emoji").order("sort_order"),
      supabase.from("combos").select("id, nome, emoji, description, tour_ids, preco_combo, dias_min").eq("ativo", true).order("sort_order"),
      supabase.from("hotel_prices").select("city_id, hotel_style_id, room_type, price_per_night, season_note"),
      supabase.from("seasonal_rules").select("name, months, adjustment_type, adjustment_value, city_ids").eq("ativo", true),
    ])

    const itinerary = itinRes.data
    if (!itinerary) {
      return new Response(
        JSON.stringify({ error: "Roteiro nao encontrado ou nao pertence ao usuario." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const answers = answersRes.data
    const existingMessages = messagesRes.data || []
    const allTours = toursRes.data || []
    const allTransfers = transfersRes.data || []
    const allCities = citiesRes.data || []
    const allCombos = combosRes.data || []
    const allHotelPrices = hotelPricesRes.data || []
    const allSeasonalRules = seasonalRes.data || []

    // Build maps
    const toursMap: Record<string, typeof allTours[0]> = {}
    for (const t of allTours) toursMap[t.id] = t

    const citiesMap: Record<string, string> = {}
    for (const c of allCities) citiesMap[c.id] = c.nome

    const total = (answers?.adultos || 1) + (answers?.criancas || 0)

    const getTransferPrice = (tr: typeof allTransfers[0]): number => {
      if (!tr) return 0
      if (total <= 2) return Number(tr.price_1_2) || 0
      if (total <= 6) return Number(tr.price_3_6) || 0
      if (total <= 11) return Number(tr.price_7_11) || 0
      return Number(tr.price_12_15) || 0
    }

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

    // --- Build FULL conversation history (sem limite arbitrario) ---
    const conversationHistory = [
      ...existingMessages.map((m: { role: string; content: string }) => ({
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

    // --- Build complete context ---
    let itineraryContext = ""
    if (answers) {
      const cidadesObj = (answers.cidades || {}) as Record<string, number>
      const cidadesStr = Object.entries(cidadesObj)
        .map(([k, v]) => `${citiesMap[k] || k}: ${v} noites`)
        .join(", ")

      const hotelQuartos = (answers.hotel_quartos || {}) as Record<string, number>
      const quartosInfo: string[] = []
      if (hotelQuartos.individual > 0) quartosInfo.push(`${hotelQuartos.individual} individual${hotelQuartos.individual > 1 ? "is" : ""}`)
      if (hotelQuartos.duplo > 0) quartosInfo.push(`${hotelQuartos.duplo} duplo${hotelQuartos.duplo > 1 ? "s" : ""}`)
      if (hotelQuartos.triplo > 0) quartosInfo.push(`${hotelQuartos.triplo} triplo${hotelQuartos.triplo > 1 ? "s" : ""}`)

      itineraryContext += `\n\n═══════════════════════════════════════
DADOS COMPLETOS DO CLIENTE E DA VIAGEM
═══════════════════════════════════════
Nome: ${answers.nome || "N/A"}
Perfil: ${answers.perfil || "N/A"}
Pessoas: ${total} (${answers.adultos || 0} adultos, ${answers.criancas || 0} criancas)
Datas: ${answers.data_ida ? `${answers.data_ida} a ${answers.data_volta || "N/A"}` : (answers.dias_total ? `${answers.dias_total} dias (sem datas definidas)` : "flexivel")}
Cidades e noites: ${cidadesStr || "N/A"}
Hotel: ${answers.hotel_estrelas ? `${answers.hotel_estrelas} estrelas` : "N/A"}${answers.hotel_opcao ? ` (${answers.hotel_opcao})` : ""}${answers.hotel_nome ? ` - ${answers.hotel_nome}` : ""}
Quartos: ${quartosInfo.join(" + ") || "N/A"}
Orcamento: ${answers.orcamento || "N/A"}
Ocasiao especial: ${answers.ocasiao_especial?.startsWith("Sim") ? `${answers.ocasiao_detalhe || "sim"}${answers.ocasiao_data ? ` em ${answers.ocasiao_data}` : ""}` : "nenhuma"}
Informacoes adicionais: ${answers.extras || "nenhuma"}\n`

      if (answers.passeios) {
        const passeiosList = Array.isArray(answers.passeios) ? answers.passeios : []
        const passeiosDetalhados = passeiosList
          .map((id: string) => {
            const t = toursMap[id]
            return t ? `- ${t.nome} | R$${t.valor_por_pessoa}/pessoa | ${t.tipo_passeio || "Diurno"} | ${t.duration || "N/A"} | ${t.disponibilidade || "todos os dias"} | Saida: ${t.horario_saida || "N/A"} | ${t.link_url || ""}` : `- ${id} (nao encontrado)`
          })
          .join("\n")
        itineraryContext += `\nPasseios selecionados:\n${passeiosDetalhados}\n`
      }
    }

    // Catalogo completo de passeios
    itineraryContext += `\n═══════════════════════════════════════
CATALOGO COMPLETO DE PASSEIOS DISPONIVEIS
═══════════════════════════════════════\n`
    itineraryContext += allTours.map((t: Record<string, unknown>) =>
      `- ${t.nome} (ID: ${t.id}) | R$${t.valor_por_pessoa}/pessoa | Tipo: ${t.tipo_passeio || "Diurno"} | Cidade: ${citiesMap[t.cidade_base as string] || t.cidade_base} | Duracao: ${t.duration || "N/A"} | Saida: ${t.horario_saida || "N/A"} - ${t.horario_retorno || "N/A"} | Disponibilidade: ${t.disponibilidade || "todos os dias"} | ${t.link_url || ""}`
    ).join("\n")

    // Passeios privativos (do banco, campo private_pricing)
    const privateTours = allTours.filter((t: Record<string, unknown>) => t.private_pricing && Object.keys(t.private_pricing as Record<string, unknown>).length > 0)
    if (privateTours.length > 0) {
      itineraryContext += `\n\n═══════════════════════════════════════
PASSEIOS PRIVATIVOS (valor total do grupo, NAO por pessoa)
═══════════════════════════════════════\n`
      itineraryContext += privateTours.map((t: Record<string, unknown>) => {
        const pp = (t.private_pricing || {}) as Record<string, number>
        const faixas = Object.entries(pp).filter(([, v]) => v > 0).map(([k, v]) => `${k} pax=R$${v}`).join(" | ")
        return `- ${t.nome} Privativo: ${faixas}`
      }).join("\n")
      itineraryContext += "\n(Demais passeios privativos: valor sob consulta)"
    }

    // Catalogo de transfers
    itineraryContext += `\n\n═══════════════════════════════════════
CATALOGO DE TRANSFERS
═══════════════════════════════════════\n`
    itineraryContext += allTransfers.map(t => {
      const prices: string[] = []
      if (Number(t.price_1_2) > 0) prices.push(`1-2 pax: R$${t.price_1_2}`)
      if (Number(t.price_3_6) > 0) prices.push(`3-6 pax: R$${t.price_3_6}`)
      if (Number(t.price_7_11) > 0) prices.push(`7-11 pax: R$${t.price_7_11}`)
      if (Number(t.price_12_15) > 0) prices.push(`12-15 pax: R$${t.price_12_15}`)
      return `- ${t.nome} (ID: ${t.id}): ${prices.join(" | ")}`
    }).join("\n")

    // Combos (do banco)
    if (allCombos.length > 0) {
      itineraryContext += `\n\n═══════════════════════════════════════
COMBOS COM DESCONTO (do banco)
═══════════════════════════════════════\n`
      itineraryContext += allCombos.map((c: Record<string, unknown>) => {
        const tourIds = (c.tour_ids || []) as string[]
        const tourNames = tourIds.map(id => toursMap[id]?.nome || id).join(" + ")
        const somaIndividual = tourIds.reduce((s: number, id: string) => s + (toursMap[id]?.valor_por_pessoa || 0), 0)
        return `- ${c.emoji} ${c.nome} (ID: ${c.id}): R$${c.preco_combo}/pessoa | Inclui: ${tourNames} | Individual: R$${somaIndividual} | Min ${c.dias_min} dias`
      }).join("\n")
      if (answers?.combo_id) {
        const selectedCombo = allCombos.find((c: Record<string, unknown>) => c.id === answers.combo_id)
        if (selectedCombo) {
          itineraryContext += `\n\nCombo selecionado pelo cliente: ${selectedCombo.nome} (R$${selectedCombo.preco_combo}/pessoa)`
        }
      }
    }

    // Precos de hotel (do banco)
    if (allHotelPrices.length > 0) {
      itineraryContext += `\n\n═══════════════════════════════════════
PRECOS DE HOTEL (do banco, por pessoa/noite)
═══════════════════════════════════════\n`
      const hotelStyleNames: Record<string, string> = { "3": "3 estrelas", "4": "4 estrelas", "5": "5 estrelas" }
      const roomTypeNames: Record<string, string> = { individual: "Individual", duplo: "Duplo", triplo: "Triplo" }
      const grouped: Record<string, string[]> = {}
      for (const hp of allHotelPrices) {
        const city = citiesMap[hp.city_id as string] || hp.city_id
        const style = hotelStyleNames[hp.hotel_style_id as string] || hp.hotel_style_id
        const room = roomTypeNames[hp.room_type as string] || hp.room_type
        const key = `${city} ${style}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(`${room}: R$${hp.price_per_night}/noite`)
      }
      for (const [key, rooms] of Object.entries(grouped)) {
        itineraryContext += `- ${key}: ${rooms.join(" | ")}\n`
      }
    }

    // Regras de sazonalidade
    if (allSeasonalRules.length > 0) {
      itineraryContext += `\n═══════════════════════════════════════
REGRAS DE SAZONALIDADE (ativas)
═══════════════════════════════════════\n`
      itineraryContext += allSeasonalRules.map((r: Record<string, unknown>) => {
        const months = (r.months || []) as number[]
        const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
        const monthStr = months.map(m => monthNames[m - 1] || m).join(", ")
        const cityIds = (r.city_ids || []) as string[]
        const cityStr = cityIds.length > 0 ? cityIds.map(id => citiesMap[id] || id).join(", ") : "todas"
        return `- ${r.name}: ${r.adjustment_type === "percent" ? `+${r.adjustment_value}%` : `+R$${r.adjustment_value}`} | Meses: ${monthStr} | Cidades: ${cityStr}`
      }).join("\n")
    }

    if (itinerary.generated_result) {
      itineraryContext += `\n\n═══════════════════════════════════════
ROTEIRO ATUAL DO CLIENTE
═══════════════════════════════════════\n`
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

Responda "SIM" se o usuario esta pedindo qualquer alteracao, ajuste, troca, adicao, remocao ou modificacao no roteiro ou orcamento da viagem. Exemplos: trocar passeio, inverter dias, adicionar atividade, remover passeio, mudar hotel, recalcular valores, pedir transfer privativo, etc.

Responda "NAO" se o usuario esta apenas fazendo uma pergunta, tirando duvida, pedindo informacao, agradecendo, cumprimentando, ou qualquer coisa que NAO seja um pedido de alteracao no roteiro.

Responda apenas SIM ou NAO, nada mais.`

      const classifyData = await callOpenAI(openaiKey, [
        { role: "system", content: classifyPrompt },
        ...conversationHistory.slice(-10),
      ], 5)

      const classification = (classifyData as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content?.trim()?.toUpperCase() || "NAO"
      console.log("[CHAT] Classification:", classification, "for message:", message.substring(0, 80))

      // ════════════════════════════════════════════════════════
      // STEP 2a: If modification requested, generate updated itinerary
      // ════════════════════════════════════════════════════════
      if (classification.startsWith("SIM")) {

        // Extrair numero de dias do roteiro original para validacao
        const originalDayCount = (itinerary.generated_result.match(/### Dia \d+/g) || []).length

        const modifySystemPrompt = `Voce e um assistente de modificacao de roteiros da Brasileiros no Uruguai.
O cliente pediu uma alteracao no roteiro. Aplique a alteracao solicitada e retorne o roteiro COMPLETO atualizado.

═══════════════════════════════════════
ESTRUTURA INTOCAVEL — VIOLACAO = REJEICAO
═══════════════════════════════════════
O roteiro foi calculado por algoritmo. A estrutura e SAGRADA:
- A ORDEM das cidades NAO pode mudar
- O NUMERO DE NOITES em cada cidade NAO pode mudar
- O NUMERO TOTAL DE DIAS NAO pode mudar (deve ter exatamente ${originalDayCount} dias)
- Os headers "### Dia X" DEVEM ser copiados IDENTICOS do original
- A cidade de cada dia NAO pode mudar
- Chegada e Partida DEVEM permanecer nos mesmos dias
- Check-in e check-out DEVEM permanecer nos mesmos dias
- Transfers entre cidades DEVEM permanecer nos mesmos dias

═══════════════════════════════════════
O QUE VOCE PODE MODIFICAR
═══════════════════════════════════════
- Trocar um passeio por outro (desde que caiba no mesmo dia/cidade/horario)
- Adicionar ou remover um passeio em um dia livre
- Trocar tipo de transfer (compartilhado → privativo)
- Adicionar notas ou sugestoes dentro de um dia
- Recalcular valores no orcamento QUANDO houver troca de passeio/transfer

═══════════════════════════════════════
REGRAS DE NEGOCIO
═══════════════════════════════════════
${itineraryRules}

- Use SOMENTE precos do catalogo. NUNCA invente precos.
- NUNCA remova itens que o cliente nao pediu para remover.
- Passeios "Dia Todo" ocupam o dia inteiro — nao combine com diurnos.
- Passeios Noturnos podem ser combinados com Diurnos no mesmo dia.
- Em dias de mudanca de cidade (transfer), apenas passeios Noturnos.
- Van compartilhada: APENAS para 1 pessoa, APENAS trecho Aeroporto MVD <-> Hotel MVD.
- City Tour Colonia e City Tour Punta del Este servem como TRANSPORTE entre cidades (mais barato que transfer privativo).
- O tour de transporte deve estar no PRIMEIRO dia da cidade destino (dia do checkin), NAO no ultimo dia da cidade origem.
- 3 cidades: ordem PDE → MVD → COL. City Tour Colonia = transporte MVD → COL.
- 2 cidades MVD+PDE: ordem MVD → PDE. City Tour Punta = transporte MVD → PDE.
- 2 cidades MVD+COL: ordem MVD → COL. City Tour Colonia = transporte MVD → COL.
- NUNCA mover o tour de transporte para um dia diferente sem recalcular todo o roteiro.

═══════════════════════════════════════
FORMATO DE SAIDA
═══════════════════════════════════════
- Retorne o roteiro COMPLETO (Pre-Roteiro + Pre-Orcamento).
- Mesmo formato markdown do original (## secoes, ### dias, - bullets).
- NAO adicione explicacoes, comentarios ou texto fora do roteiro.
- Se a alteracao for impossivel, retorne o roteiro original SEM modificacao.

${itineraryContext}`

        const modifyData = await callOpenAI(openaiKey, [
          { role: "system", content: modifySystemPrompt },
          ...conversationHistory.slice(-10),
        ], 5000)

        const updatedContent = (modifyData as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || ""

        // Validar: deve conter estrutura de roteiro E manter numero de dias
        if (updatedContent && (updatedContent.includes("## Pre-Roteiro") || updatedContent.includes("## Pré-Roteiro") || updatedContent.includes("### Dia"))) {
          const updatedDayCount = (updatedContent.match(/### Dia \d+/g) || []).length

          if (updatedDayCount !== originalDayCount) {
            console.log(`[CHAT] Modification REJECTED: day count changed from ${originalDayCount} to ${updatedDayCount}`)
          } else {
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
          }
        } else {
          console.log("[CHAT] Generated content did not pass validation, skipping update. Content start:", updatedContent.substring(0, 100))
        }

        // ════════════════════════════════════════════════════════
        // STEP 2b: Generate conversational reply
        // ════════════════════════════════════════════════════════
        const replySystemPrompt = basePrompt + extraDocs + itineraryContext +
          (itineraryUpdated
            ? "\n\nVoce ACABOU de atualizar o roteiro do cliente com sucesso. A alteracao ja esta visivel na tela dele. Confirme brevemente o que foi alterado de forma simpatica e natural (2-3 frases). Nao repita o roteiro inteiro."
            : "\n\nVoce tentou alterar o roteiro mas nao foi possivel. Explique brevemente o motivo e sugira alternativas.")

        const replyData = await callOpenAI(openaiKey, [
          { role: "system", content: replySystemPrompt },
          ...conversationHistory,
        ], 400)

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
      ], 400)

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
