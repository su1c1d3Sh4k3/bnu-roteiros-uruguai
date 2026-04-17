import { useState, useRef, useEffect } from "react";

// ============================================================
// IMAGENS — substitua as URLs pelos links reais das imagens
// Você pode hospedar no Imgur (gratuito) ou Cloudinary
// ============================================================
const FAVICON_SRC = "https://SUA_URL_AQUI/favicon.jpg";

const BNU_IMGS = {
  "bouza":       "https://SUA_URL_AQUI/bouza.jpg",
  "pizzorno":    "https://SUA_URL_AQUI/pizzorno.jpg",
  "primuseum":   "https://SUA_URL_AQUI/primuseum.jpg",
  "milongon":    "https://SUA_URL_AQUI/milongon.jpg",
  "city_mvd":    "https://SUA_URL_AQUI/city_mvd.jpg",
  "city_pde":    "https://SUA_URL_AQUI/city_pde.jpg",
  "city_col":    "https://SUA_URL_AQUI/city_col.jpg",
  "daytour_pde": "https://SUA_URL_AQUI/daytour_pde.jpg",
};

const FALLBACK_IMGS = {
  "bouza":       "https://SUA_URL_AQUI/bouza.jpg",
  "pizzorno":    "https://SUA_URL_AQUI/pizzorno.jpg",
  "primuseum":   "https://SUA_URL_AQUI/primuseum.jpg",
  "milongon":    "https://SUA_URL_AQUI/milongon.jpg",
  "city_mvd":    "https://SUA_URL_AQUI/city_mvd.jpg",
  "city_pde":    "https://SUA_URL_AQUI/city_pde.jpg",
  "city_col":    "https://SUA_URL_AQUI/city_col.jpg",
  "daytour_pde": "https://SUA_URL_AQUI/daytour_pde.jpg",
};

function TourImage({ id, nome }) {
  const [src, setSrc] = useState(BNU_IMGS[id] || FALLBACK_IMGS[id]);
  const [tried, setTried] = useState(false);
  return (
    <img
      src={src}
      alt={nome}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      onError={() => {
        if (!tried) { setTried(true); setSrc(FALLBACK_IMGS[id]); }
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════
const PASSEIOS_OPCOES = [
  { id: "city_mvd", nome: "City Tour Montevideo", valor: 129, emoji: "🏙️", desc: "Principais pontos turísticos com guia em português", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "city_pde", nome: "City Tour Punta del Este", valor: 240, emoji: "🏖️", desc: "A joia do Atlântico, saindo de Montevideo", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "city_col", nome: "City Tour Colonia del Sacramento", valor: 395, emoji: "🏛️", desc: "Centro histórico tombado pela UNESCO", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "pizzorno", nome: "Almoço na Bodega Pizzorno", valor: 720, emoji: "🍷", desc: "Visita à vinícola + almoço harmonizado completo", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "bouza", nome: "Degustação na Bodega Bouza", valor: 520, emoji: "🍾", desc: "Degustação de vinhos + tábua de queijos especiais", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "primuseum", nome: "Primuseum: Jantar & Tango", valor: 690, emoji: "💃", desc: "Show de tango com jantar completo incluído", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "milongon", nome: "El Milongón: Danças Típicas", valor: 820, emoji: "🎭", desc: "Show de danças uruguaias + jantar + transfer", diasMin: 1, cidadeBase: "Montevideo" },
  { id: "daytour_pde", nome: "Day Tour Punta (saindo de Punta)", valor: 370, emoji: "🌅", desc: "Pôr do sol na Casapueblo + ingresso incluso", diasMin: 1, cidadeBase: "Punta del Este" },
];

const CIDADES_OPTIONS = [
  { id: "mvd", nome: "Montevideo", emoji: "🏙️", desc: "Capital e maior cidade" },
  { id: "pde", nome: "Punta del Este", emoji: "🏖️", desc: "Praias e luxo" },
  { id: "col", nome: "Colonia del Sacramento", emoji: "🏛️", desc: "Patrimônio histórico" },
  { id: "jose", nome: "José Ignacio", emoji: "🌿", desc: "Charme e natureza" },
  { id: "carmelo", nome: "Carmelo", emoji: "🍇", desc: "Vinhedos e sossego" },
  { id: "outro", nome: "Outro", emoji: "📍", desc: "Outra cidade" },
];

const PERFIS = [
  { id: "casal", emoji: "👫", label: "Casal" },
  { id: "familia", emoji: "👨‍👩‍👧‍👦", label: "Família com crianças" },
  { id: "amigos", emoji: "🧑‍🤝‍🧑", label: "Grupo de amigos" },
  { id: "lua_de_mel", emoji: "💍", label: "Lua de mel" },
  { id: "solo", emoji: "🧳", label: "Viagem solo" },
  { id: "negocios", emoji: "💼", label: "Viagem a negócios" },
];

const ESTILOS_HOTEL = [
  { id: "3", emoji: "🏨", label: "Econômico", desc: "Confortável e bem localizado, foco no custo-benefício", stars: "★★★" },
  { id: "4", emoji: "🏨", label: "Intermediário", desc: "Boa qualidade, equilíbrio entre conforto e preço", stars: "★★★★" },
  { id: "5", emoji: "🌟", label: "Superior / Premium", desc: "Hotel top, diferenciais como vista pro mar e estrutura completa", stars: "★★★★★" },
];

const ORCAMENTOS = [
  { id: "ate3500", label: "Até R$ 3.500 por pessoa" },
  { id: "3500_5k", label: "R$ 3.500 a R$ 5.000 por pessoa" },
  { id: "5k_8k", label: "R$ 5.000 a R$ 8.000 por pessoa" },
  { id: "8k_12k", label: "R$ 8.000 a R$ 12.000 por pessoa" },
  { id: "12k_mais", label: "Acima de R$ 12.000 por pessoa" },
];

const KNOWLEDGE = `Você é Rodrigo, consultor virtual da agência "Brasileiros no Uruguai" (BNU), a maior operadora brasileira especializada no Uruguai, fundada em 2013. Responda sempre em português, de forma cordial e objetiva. Sem travessões. Use emojis com moderação.

PASSEIOS REGULARES (valor por pessoa):
City Tour Montevideo: R$129 | todos os dias | 3h30
City Tour Punta del Este (de Montevideo): R$240 | todos exceto quinta | 9h
City Tour Colonia del Sacramento: R$395 | ter/qui/sáb | 9h
Ingresso Casapueblo: R$105 (opcional, crianças até 12 anos grátis)
Almoço Bodega Pizzorno: R$720 | todos os dias
Degustação Bodega Bouza: R$520 | todos os dias
Almoço Bodega Bouza: R$990 | todos os dias
Primuseum Jantar+Tango: R$690 | qui a dom
El Milongón com jantar (com transfer): R$820 | seg a sáb
Day Tour Punta del Este (saindo de Punta): R$370 | todos os dias

PASSEIOS PRIVATIVOS (valor total do grupo):
City Tour Montevideo: 1-3=R$1.650 | 4-9=R$2.600 | 10-12=R$3.040 | 12-15=R$3.380
City Tour Punta del Este: 1-3=R$3.850 | 4-9=R$4.950 | 10-12=R$5.650 | 12-15=R$6.850
City Tour Colonia: 1-3=R$4.750 | 4-9=R$5.850 | 10-12=R$6.850 | 12-15=R$7.350

TRANSFERS (por trecho):
Aeroporto Montevideo: 1-2=R$360 | 3-6=R$550 | 7-11=R$702 | 12-15=R$900
Montevideo a Punta del Este: 1-2=R$1.950 | 3-6=R$2.600 | 7-11=R$3.000 | 12-15=R$3.200
Montevideo a Colonia: 1-2=R$2.700 | 3-6=R$3.100 | 7-11=R$3.400 | 12-15=R$3.700

ALTERNATIVA ECONOMICA PARA LOCOMOCAO ENTRE CIDADES (IMPORTANTE):
Em vez de um transfer privativo, o cliente pode usar o City Tour como transporte + passeio em um so servico:
- IDA: compra o City Tour Punta del Este (R$240/pessoa) ou City Tour Colonia (R$395/pessoa), faz o passeio e fica na cidade ao final sem retornar com o grupo.
- VOLTA: paga novamente o valor cheio do mesmo City Tour para retornar a Montevideo, pois ocupa um assento de uma pessoa pagante no onibus.
- ECONOMIA: mesmo pagando 2x o city tour (ida + volta), sai muito mais barato que transfer privativo, especialmente para grupos pequenos. Ex: casal a Punta = 4 x R$240 = R$960 total (ida+volta+passeio) vs. transfer privativo R$1.950 x 2 trechos = R$3.900.
- Sempre mencionar essa opcao quando o cliente perguntar sobre como se locomover entre Montevideo e Punta del Este ou Colonia.

HOTEIS (valores APROXIMADOS por pessoa/noite, quarto duplo):
Montevideo: 3 estrelas aprox. R$235 | 4 estrelas aprox. R$300 | 5 estrelas aprox. R$600
Punta del Este: 3 estrelas aprox. R$250 | 4 estrelas aprox. R$300 | 5 estrelas aprox. R$850
Colonia: 3 estrelas aprox. R$315 | 4 estrelas aprox. R$340 | 5 estrelas aprox. R$470
Obs: Julho +20% Mvd/Colonia. Dez/Jan +20% Mvd/Colonia e +40% Punta.
O sistema NAO sugere hoteis especificos. Sugestoes de hoteis sao feitas exclusivamente pela Consultora Especialista. Se cliente quiser indicacoes, informar que a Consultora Especialista enviara as opcoes ideais apos o envio do formulario.

REGRAS:
1. Nunca inventar valores. Para City Tour Punta: SEMPRE perguntar se hospedado em Montevideo ou Punta.
2. Desconto 5%: so com mais de 3 passeios E grupo 4+ pessoas, pagamento no dia.
3. Por do sol Casapueblo: so o Day Tour saindo de Punta.
4. Pagamento: PIX CNPJ 15.343.169/0001-11 ou cartao ate 3x.
5. Sempre que mencionar valor de hospedagem, deixar claro que e um valor aproximado.`;

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function boldify(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function MarkdownText({ text, noBold }) {
  if (!text) return null;
  const process = (t) => noBold ? t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1") : boldify(t);
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} style={{ color: "#0D3B8C", marginTop: 20, marginBottom: 6, fontSize: 16, fontWeight: 700 }}>{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#0D3B8C", marginTop: 24, marginBottom: 8, fontSize: 18, fontWeight: 800, borderBottom: "2px solid #F59E0B", paddingBottom: 4 }}>{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} style={{ color: "#0D3B8C", marginTop: 24, marginBottom: 10, fontSize: 22, fontWeight: 900 }}>{line.slice(2)}</h1>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#F59E0B", flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: process(line.slice(2)) }} /></div>;
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)[1];
          return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#0D3B8C", fontWeight: 700, flexShrink: 0, minWidth: 20 }}>{num}.</span><span dangerouslySetInnerHTML={{ __html: process(line.replace(/^\d+\. /, "")) }} /></div>;
        }
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} style={{ margin: "4px 0" }} dangerouslySetInnerHTML={{ __html: process(line) }} />;
      })}
    </div>
  );
}

function BNULogo({ size = 48 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.18, overflow: "hidden", flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
      <img src={FAVICON_SRC} alt="BNU" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DATE RANGE PICKER
// ═══════════════════════════════════════════════════════
function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DAYS_LABEL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const parseDate = (str) => {
    if (!str) return null;
    const [d, mo, y] = str.split("/");
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  };
  const formatDate = (dt) => {
    if (!dt) return "";
    return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
  };

  const s = parseDate(startDate);
  const e = parseDate(endDate);

  const handleDayClick = (dt) => {
    if (!s || (s && e)) { onChange(formatDate(dt), ""); }
    else {
      if (dt < s) { onChange(formatDate(dt), formatDate(s)); }
      else { onChange(formatDate(s), formatDate(dt)); setOpen(false); }
    }
  };

  const isInRange = (dt) => {
    if (!s) return false;
    const end = e || (hovered ? parseDate(hovered) : null);
    if (!end) return false;
    const lo = s < end ? s : end;
    const hi = s < end ? end : s;
    return dt > lo && dt < hi;
  };

  const isStart = (dt) => s && dt.toDateString() === s.toDateString();
  const isEnd = (dt) => e && dt.toDateString() === e.toDateString();
  const today = new Date(); today.setHours(0,0,0,0);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const nights = s && e ? Math.round((e - s) / 86400000) : 0;
  const displayValue = s && e ? `${formatDate(s)}  →  ${formatDate(e)}` : s ? `${formatDate(s)}  →  selecione a volta` : "Selecione o período da viagem";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}
        style={{ border: `1.5px solid ${open ? "#0D3B8C" : "#E2E8F0"}`, borderRadius: 12, padding: "13px 16px", cursor: "pointer", background: "white", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, color: s ? "#0F172A" : "#94A3B8" }}>
        <span>📅 {displayValue}</span>
        <span style={{ fontSize: 12, color: "#0D3B8C" }}>{open ? "▲" : "▼"}</span>
      </div>
      {nights > 0 && (
        <div style={{ fontSize: 13, color: "#1B6E3C", fontWeight: 700, marginTop: 8, background: "#F0FDF4", border: "1px solid #22C55E", borderRadius: 8, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ✈️ <span>{nights} noite{nights > 1 ? "s" : ""} no Uruguai</span>
        </div>
      )}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 500, background: "white", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", border: "1px solid #E2E8F0", padding: 20, minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0D3B8C" }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
            {DAYS_LABEL.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", fontWeight: 600, padding: "4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((dt, i) => {
              if (!dt) return <div key={i} />;
              const past = dt < today;
              const inRange = isInRange(dt);
              const start = isStart(dt);
              const end = isEnd(dt);
              const selected = start || end;
              return (
                <div key={i} onClick={() => !past && handleDayClick(dt)}
                  onMouseEnter={() => s && !e && setHovered(formatDate(dt))}
                  onMouseLeave={() => setHovered(null)}
                  style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: selected ? 10 : inRange ? 0 : 10,
                    background: selected ? "#0D3B8C" : inRange ? "#DBEAFE" : "transparent",
                    color: selected ? "white" : past ? "#CBD5E1" : "#0F172A",
                    fontWeight: selected ? 700 : 400, fontSize: 14,
                    cursor: past ? "not-allowed" : "pointer",
                    borderTopLeftRadius: start || (!inRange && !end) ? 10 : 0,
                    borderBottomLeftRadius: start || (!inRange && !end) ? 10 : 0,
                    borderTopRightRadius: end || (!inRange && !start) ? 10 : 0,
                    borderBottomRightRadius: end || (!inRange && !start) ? 10 : 0,
                  }}>
                  {dt.getDate()}
                </div>
              );
            })}
          </div>
          {(!s || (s && !e)) && <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 14 }}>{!s ? "Clique na data de chegada" : "Agora clique na data de partida"}</p>}
        </div>
      )}
    </div>
  );
}

// Single Date Picker
function SingleDatePicker({ value, onChange, label, placeholder }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DAYS_LABEL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const getDays = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirst = (y, m) => new Date(y, m, 1).getDay();

  const formatDate = (dt) => dt ? `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}` : "";
  const parseDate = (str) => { if (!str) return null; const [d,mo,y] = str.split("/"); const dt = new Date(Number(y),Number(mo)-1,Number(d)); return isNaN(dt.getTime())?null:dt; };

  const selected = parseDate(value);
  const cells = [];
  for (let i = 0; i < getFirst(viewYear, viewMonth); i++) cells.push(null);
  for (let d = 1; d <= getDays(viewYear, viewMonth); d++) cells.push(new Date(viewYear, viewMonth, d));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && <label style={{ fontSize: 14, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>{label}</label>}
      <div onClick={() => setOpen(!open)}
        style={{ border: `1.5px solid ${open ? "#0D3B8C" : "#E2E8F0"}`, borderRadius: 12, padding: "13px 16px", cursor: "pointer", background: "white", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, color: value ? "#0F172A" : "#94A3B8" }}>
        <span>📅 {value || placeholder || "Selecione a data"}</span>
        <span style={{ fontSize: 12, color: "#0D3B8C" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 500, background: "white", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", border: "1px solid #E2E8F0", padding: 20, minWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={() => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); }} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0D3B8C" }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); }} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
            {DAYS_LABEL.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", fontWeight: 600, padding: "4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((dt, i) => {
              if (!dt) return <div key={i} />;
              const isSel = selected && dt.toDateString() === selected.toDateString();
              return <div key={i} onClick={() => { onChange(formatDate(dt)); setOpen(false); }}
                style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: isSel ? "#0D3B8C" : "transparent", color: isSel ? "white" : "#0F172A", fontWeight: isSel ? 700 : 400, fontSize: 14, cursor: "pointer" }}>
                {dt.getDate()}
              </div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TRIP TIMELINE
// ═══════════════════════════════════════════════════════
function TripTimeline({ answers }) {
  const cidades = answers.cidades || {};
  const cidadesList = Object.entries(cidades).map(([k, v]) => ({
    id: k, nome: CIDADES_OPTIONS.find(c => c.id === k)?.nome || k,
    emoji: CIDADES_OPTIONS.find(c => c.id === k)?.emoji || "📍", noites: Number(v)
  })).filter(c => c.noites > 0);

  const parseDate = (str) => {
    if (!str) return null;
    const [d, m, y] = str.split("/");
    return new Date(Number(y), Number(m) - 1, Number(d));
  };
  const start = parseDate(answers.data_ida);
  const end = parseDate(answers.data_volta);
  const addDays = (dt, n) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
  const fmt = (dt) => dt ? dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "?";

  if (cidadesList.length === 0 && !start) return null;

  const segments = [];
  let cursor = start;
  if (start) {
    segments.push({ type: "event", label: "Chegada", date: fmt(start), emoji: "✈️", color: "#0D3B8C" });
    cidadesList.forEach((c) => {
      const partida = cursor ? addDays(cursor, c.noites) : null;
      segments.push({ type: "city", label: c.nome, emoji: c.emoji, noites: c.noites, dateFrom: fmt(cursor), dateTo: fmt(partida), color: "#1B6E3C" });
      cursor = partida;
    });
    segments.push({ type: "event", label: "Partida", date: end ? fmt(end) : fmt(cursor), emoji: "🛫", color: "#F59E0B" });
  } else {
    cidadesList.forEach((c) => segments.push({ type: "city", label: c.nome, emoji: c.emoji, noites: c.noites, dateFrom: null, dateTo: null, color: "#1B6E3C" }));
  }

  const totalNoites = cidadesList.reduce((s, c) => s + c.noites, 0);

  return (
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0D3B8C", margin: 0 }}>Visão Geral da Viagem</h2>
        {totalNoites > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: "#64748B", background: "#F1F5F9", padding: "3px 12px", borderRadius: 20 }}>{totalNoites} noites</span>}
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: Math.max(400, segments.length * 110) }}>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: seg.type === "city" ? Math.max(1, seg.noites) : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: seg.type === "event" ? 64 : 80 }}>
                <div style={{ width: 48, height: 48, borderRadius: seg.type === "event" ? "50%" : 14, background: seg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {seg.emoji}
                </div>
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: "#0F172A", whiteSpace: "nowrap" }}>{seg.label}</div>
                  {seg.type === "city" && seg.noites && <div style={{ fontSize: 11, color: "#64748B" }}>{seg.noites} noite{seg.noites > 1 ? "s" : ""}</div>}
                  {seg.type === "city" && seg.dateFrom && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{seg.dateFrom}</div>}
                  {seg.type === "event" && seg.date && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{seg.date}</div>}
                </div>
              </div>
              {i < segments.length - 1 && (
                <div style={{ flex: 1, height: 3, background: `linear-gradient(90deg, ${seg.color}, ${segments[i+1].color})`, margin: "0 4px", marginTop: -28, borderRadius: 2, minWidth: 16, position: "relative" }}>
                  <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, background: "white", border: "2px solid #CBD5E1", borderRadius: "50%" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHAT PANEL
// ═══════════════════════════════════════════════════════
function ChatPanel({ messages, input, setInput, loading, onSend, endRef, onClose }) {
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(input); } };
  return (
    <div style={{ position: "fixed", bottom: 90, right: 20, width: 340, height: 500, background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", zIndex: 1000, overflow: "hidden", border: "1px solid #E2E8F0" }}>
      <div style={{ background: "linear-gradient(135deg, #0D3B8C, #1E5CB5)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧑‍💼</div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Rodrigo</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Consultor BNU • Online</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? "linear-gradient(135deg, #0D3B8C, #1E5CB5)" : "#F1F5F9", color: m.role === "user" ? "white" : "#1E293B", fontSize: 13, lineHeight: 1.5 }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: "#F1F5F9", borderRadius: "18px 18px 18px 4px", width: "fit-content" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#94A3B8", animation: "bounce 1s infinite", animationDelay: `${i*0.2}s` }} />)}
        </div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Pergunte sobre o Uruguai..."
          style={{ flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "10px 12px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", maxHeight: 80, lineHeight: 1.4 }} rows={1} />
        <button onClick={() => onSend(input)} disabled={!input.trim() || loading}
          style={{ width: 40, height: 40, borderRadius: "50%", background: input.trim() ? "linear-gradient(135deg, #0D3B8C, #1E5CB5)" : "#E2E8F0", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════════════════
function WelcomeScreen({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(145deg, #0D2B5C 0%, #0D3B8C 40%, #1B6E3C 100%)", padding: "60px 24px 80px", textAlign: "center", color: "white", position: "relative", overflow: "hidden" }}>
        {/* subtle rings */}
        {[200,320,440].map((s,i) => <div key={i} style={{ position: "absolute", width: s, height: s, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />)}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", marginBottom: 20, borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.35)", width: 96, height: 96 }}>
            <img src={FAVICON_SRC} alt="BNU" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 6px", letterSpacing: -1, lineHeight: 1.1 }}>Seu Roteiro Perfeito para o Uruguai</h1>
          <p style={{ fontSize: 13, fontWeight: 400, margin: "0 0 28px", opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>Brasileiros no Uruguai</p>
          <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "24px 28px", maxWidth: 480, margin: "0 auto 36px", textAlign: "left" }}>
            <p style={{ fontSize: 16, lineHeight: 1.8, margin: "0 0 12px", opacity: 0.95 }}>
              Voce acaba de ganhar acesso ao seu planejador de viagem para o Uruguai! 😊
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.75, margin: "0 0 12px", opacity: 0.85 }}>
              🗺️ Este e o seu planejador exclusivo: um especialista dedicado a entender cada detalhe da sua viagem e transformar isso em um roteiro sob medida, com as melhores dicas, os passeios certos para o seu perfil e suporte para cada duvida que surgir.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, opacity: 0.95, fontWeight: 600 }}>
              ✈️ Vamos montar algo incrivel juntos. Vamos comecar?
            </p>
          </div>
          <button onClick={onStart}
            style={{ background: "white", color: "#0D3B8C", border: "none", padding: "18px 52px", borderRadius: 100, fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", letterSpacing: 0.3, transition: "transform 0.15s" }}
            onMouseEnter={e => e.target.style.transform = "scale(1.04)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}>
            Comecar Meu Roteiro
          </button>
          <p style={{ marginTop: 14, fontSize: 13, opacity: 0.55 }}>Leva apenas 3 minutos</p>
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px 0" }}>
        <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 32 }}>Como funciona</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 40 }}>
          {[
            ["📝", "Responda as perguntas", "Informe suas preferências, datas e cidades de interesse"],
            ["🗺️", "Receba o roteiro", "O sistema monta um pré-roteiro com passeios e orçamento"],
            ["📩", "Fale com a consultora", "Envie para a Consultora Especialista confirmar e fechar sua reserva"],
          ].map(([e, t, d]) => (
            <div key={t} style={{ textAlign: "center", padding: "24px 16px", background: "white", borderRadius: 16, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{e}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0D3B8C", marginBottom: 6 }}>{t}</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* Chat callout */}
        <div style={{ background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)", border: "2px solid #0D3B8C", borderRadius: 20, padding: "24px 28px", marginBottom: 40, display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #0D3B8C, #1B6E3C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🧑‍💼</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0D3B8C", marginBottom: 6 }}>Rodrigo esta aqui para te ajudar!</div>
            <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>
              Em qualquer etapa do formulário, clique no <strong>botão de chat</strong> no canto da tela para tirar duvidas com o Rodrigo, nosso consultor especialista em roteiros para o Uruguai. Ele responde na hora!
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", paddingBottom: 40 }}>
          <button onClick={onStart}
            style={{ background: "linear-gradient(135deg, #0D3B8C, #1B6E3C)", color: "white", border: "none", padding: "16px 48px", borderRadius: 100, fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(13,59,140,0.3)" }}>
            Comecar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SMALL INPUTS
// ═══════════════════════════════════════════════════════
function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      {label && <label style={{ fontSize: 14, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        onFocus={e => e.target.style.borderColor = "#0D3B8C"}
        onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
    </div>
  );
}

function NumberInput({ label, value, onChange, min = 0, max = 100 }) {
  return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 600, color: "#334155", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #E2E8F0", background: "white", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#334155" }}>−</button>
        <span style={{ fontSize: 22, fontWeight: 800, minWidth: 40, textAlign: "center", color: "#0D3B8C" }}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#0D3B8C", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white" }}>+</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STEP CONTENT
// ═══════════════════════════════════════════════════════
function StepContent({ stepId, answers, setAnswers }) {
  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  if (stepId === 1) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Input label="Nome completo *" value={answers.nome || ""} onChange={v => update("nome", v)} placeholder="Ex: Ana Lima" />
      <Input label="WhatsApp *" value={answers.whatsapp || ""} onChange={v => update("whatsapp", v)} placeholder="Ex: (11) 99999-9999" />
      <Input label="E-mail *" value={answers.email || ""} onChange={v => update("email", v)} placeholder="seu@email.com" type="email" />
      {/* Animated chat hint */}
      <div style={{ position: "relative", background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)", border: "1.5px solid #BFDBFE", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, marginTop: 8, animation: "pulseHint 2.5s ease-in-out infinite" }}>
        <div style={{ fontSize: 22, flexShrink: 0 }}>💬</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0D3B8C", marginBottom: 2 }}>Duvidas? Fale com o Rodrigo!</div>
          <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>Clique no botao de chat no canto da tela para tirar qualquer duvida na hora.</div>
        </div>
        {/* Arrow pointing to bottom-right */}
        <div style={{ position: "absolute", right: 70, bottom: -28, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 20, animation: "bounceArrow 1s ease-in-out infinite" }}>↘</div>
        </div>
      </div>
      <style>{`
        @keyframes pulseHint { 0%,100%{box-shadow:0 0 0 0 rgba(13,59,140,0.15)} 50%{box-shadow:0 0 0 8px rgba(13,59,140,0)} }
        @keyframes bounceArrow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
      `}</style>
    </div>
  );

  if (stepId === 2) return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {PERFIS.map(p => (
        <div key={p.id} onClick={() => update("perfil", p.id)}
          style={{ border: `2px solid ${answers.perfil === p.id ? "#0D3B8C" : "#E2E8F0"}`, borderRadius: 14, padding: "16px 12px", cursor: "pointer", background: answers.perfil === p.id ? "#EFF6FF" : "white", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
          <span style={{ fontSize: 28 }}>{p.emoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, textAlign: "center" }}>{p.label}</span>
        </div>
      ))}
    </div>
  );

  if (stepId === 3) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <NumberInput label="Adultos *" value={answers.adultos || 1} onChange={v => update("adultos", v)} min={1} max={50} />
        <NumberInput label="Criancas (ate 11 anos)" value={answers.criancas || 0} onChange={v => update("criancas", v)} min={0} max={20} />
      </div>
      {(answers.criancas > 0) && (
        <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 12, padding: 12, fontSize: 13 }}>
          Criancas ate 12 anos nao pagam ingresso na Casapueblo. Ha passeios especialmente indicados para familias.
        </div>
      )}
    </div>
  );

  if (stepId === 4) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
        {["Tenho datas definidas", "Ainda nao definidas"].map(opt => (
          <button key={opt} onClick={() => { update("datas_definidas", opt === "Tenho datas definidas"); if (opt !== "Tenho datas definidas" && !answers.dias_total) update("dias_total", 5); }}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: `2px solid ${answers.datas_definidas === (opt === "Tenho datas definidas") ? "#0D3B8C" : "#E2E8F0"}`, background: answers.datas_definidas === (opt === "Tenho datas definidas") ? "#EFF6FF" : "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            {opt === "Tenho datas definidas" ? "Tenho as datas" : "Ainda nao sei"}
          </button>
        ))}
      </div>
      {answers.datas_definidas === true && (
        <DateRangePicker startDate={answers.data_ida || ""} endDate={answers.data_volta || ""}
          onChange={(start, end) => { update("data_ida", start); update("data_volta", end); }} />
      )}
      {answers.datas_definidas === false && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <NumberInput label="Quantos dias pretende ficar?" value={answers.dias_total || 5} onChange={v => { update("dias_total", v); }} min={1} max={30} />
          {(answers.dias_total || 5) > 1 && (
            <div style={{ background: "#F0FDF4", border: "1px solid #22C55E", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
              ✅ {(answers.dias_total || 5) - 1} noite{(answers.dias_total || 5) - 1 > 1 ? "s" : ""} no Uruguai
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (stepId === 5) {
    const cidades = answers.cidades || {};
    const toggleCidade = (id) => {
      const novo = { ...cidades };
      if (novo[id] !== undefined) { delete novo[id]; } else { novo[id] = id === "outro" ? "" : 2; }
      update("cidades", novo);
    };

    // Calculate total nights from trip dates
    const parseDate = (str) => {
      if (!str) return null;
      const [d, m, y] = str.split("/");
      return new Date(Number(y), Number(m) - 1, Number(d));
    };
    const tripStart = parseDate(answers.data_ida);
    const tripEnd = parseDate(answers.data_volta);
    const totalTripNights = tripStart && tripEnd ? Math.round((tripEnd - tripStart) / 86400000) : (answers.dias_total > 1 ? answers.dias_total - 1 : null);
    const usedNights = Object.values(cidades).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const remainingNights = totalTripNights !== null ? totalTripNights - usedNights : null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {totalTripNights !== null && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
            <span>Total da viagem: <strong>{totalTripNights} noites</strong></span>
            <span style={{ color: remainingNights === 0 ? "#1B6E3C" : remainingNights < 0 ? "#DC2626" : "#0D3B8C", fontWeight: 700 }}>
              {remainingNights >= 0 ? `${remainingNights} noite${remainingNights !== 1 ? "s" : ""} disponível${remainingNights !== 1 ? "is" : ""}` : `${Math.abs(remainingNights)} noite${Math.abs(remainingNights) !== 1 ? "s" : ""} a mais`}
            </span>
          </div>
        )}
        {remainingNights < 0 && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#DC2626" }}>
            Voce selecionou mais noites do que o total da viagem. Ajuste os valores abaixo.
          </div>
        )}
        <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#92400E", lineHeight: 1.6, display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ fontSize: 18, flexShrink: 0 }}>💡</span><span>Lembrete: Se hospedar em mais de uma cidade em um período curto de viagem pode ser cansativo, além de aumentar o orçamento da viagem devido aos transfers para se locomover entre cidades.</span></div>
        <p style={{ fontSize: 13, color: "#64748B" }}>Selecione as cidades e informe quantas noites em cada uma:</p>
        {CIDADES_OPTIONS.map(c => (
          <div key={c.id} style={{ border: `2px solid ${cidades[c.id] !== undefined ? "#0D3B8C" : "#E2E8F0"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", background: cidades[c.id] !== undefined ? "#EFF6FF" : "white", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => toggleCidade(c.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{c.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{c.desc}</div>
                </div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${cidades[c.id] !== undefined ? "#0D3B8C" : "#CBD5E1"}`, background: cidades[c.id] !== undefined ? "#0D3B8C" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cidades[c.id] !== undefined && <span style={{ color: "white", fontSize: 14 }}>✓</span>}
              </div>
            </div>
            {cidades[c.id] !== undefined && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2E8F0" }} onClick={e => e.stopPropagation()}>
                {c.id === "outro"
                  ? <Input label="Qual cidade?" value={cidades[c.id]} onChange={v => update("cidades", { ...cidades, outro: v })} placeholder="Nome da cidade..." />
                  : <NumberInput label="Quantas noites?" value={cidades[c.id]}
                      onChange={v => {
                        const maxAllowed = totalTripNights !== null ? totalTripNights - (usedNights - (Number(cidades[c.id]) || 0)) : 99;
                        update("cidades", { ...cidades, [c.id]: Math.min(v, Math.max(1, maxAllowed)) });
                      }}
                      min={1} max={totalTripNights || 99} />
                }
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (stepId === 6) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {ESTILOS_HOTEL.map(h => (
        <div key={h.id} onClick={() => update("hotel_estrelas", h.id)}
          style={{ border: `2px solid ${answers.hotel_estrelas === h.id ? "#0D3B8C" : "#E2E8F0"}`, borderRadius: 16, padding: "16px 20px", cursor: "pointer", background: answers.hotel_estrelas === h.id ? "#EFF6FF" : "white", display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s" }}>
          <div style={{ fontSize: 30 }}>{h.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{h.stars} {h.label}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{h.desc}</div>
          </div>
          {answers.hotel_estrelas === h.id && <div style={{ color: "#0D3B8C", fontSize: 20 }}>✓</div>}
        </div>
      ))}
    </div>
  );

  if (stepId === 7) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {["Ja tenho hotel em mente", "Quero sugestoes de hoteis"].map(opt => (
          <button key={opt} onClick={() => update("hotel_opcao", opt)}
            style={{ flex: 1, padding: "14px 12px", borderRadius: 12, border: `2px solid ${answers.hotel_opcao === opt ? "#0D3B8C" : "#E2E8F0"}`, background: answers.hotel_opcao === opt ? "#EFF6FF" : "white", cursor: "pointer", fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>
            {opt === "Ja tenho hotel em mente" ? "Ja tenho hotel em mente" : "Quero sugestoes de hoteis"}
          </button>
        ))}
      </div>
      {answers.hotel_opcao === "Ja tenho hotel em mente" && (
        <Input label="Qual hotel(is)?" value={answers.hotel_nome || ""} onChange={v => update("hotel_nome", v)} placeholder="Ex: Cottage Hotel, Sofitel..." />
      )}
    </div>
  );

  if (stepId === 8) return (
    <div>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>Selecione os passeios de interesse (pode marcar varios):</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PASSEIOS_OPCOES.map(p => {
          const sel = (answers.passeios || []).includes(p.id);
          return (
            <div key={p.id} onClick={() => {
              const cur = answers.passeios || [];
              update("passeios", sel ? cur.filter(x => x !== p.id) : [...cur, p.id]);
            }}
              style={{ border: `2px solid ${sel ? "#0D3B8C" : "#E2E8F0"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ height: 110, overflow: "hidden", position: "relative", background: "#E2E8F0" }}>
                <TourImage id={p.id} nome={p.nome} />
                {sel && <div style={{ position: "absolute", inset: 0, background: "rgba(13,59,140,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ background: "white", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#0D3B8C", fontWeight: 800, fontSize: 16 }}>✓</div>
                </div>}
              </div>
              <div style={{ padding: "8px 10px", background: sel ? "#EFF6FF" : "white" }}>
                <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, color: "#0F172A" }}>{p.emoji} {p.nome}</div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{p.desc}</div>
                <div style={{ fontSize: 13, color: "#1B6E3C", fontWeight: 700, marginTop: 4 }}>R$ {p.valor}/pessoa</div>
              </div>
            </div>
          );
        })}
      </div>
      {(answers.passeios || []).length > 2 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #22C55E", borderRadius: 10, padding: 10, marginTop: 12, fontSize: 13, color: "#166534" }}>
          Com {(answers.passeios || []).length} passeios, voce pode ter direito a desconto especial!
        </div>
      )}
    </div>
  );

  if (stepId === 9) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {["Sim, tenho algo para comemorar!", "Nao, e uma viagem normal"].map(opt => (
          <button key={opt} onClick={() => update("ocasiao_especial", opt)}
            style={{ flex: 1, padding: "14px 12px", borderRadius: 12, border: `2px solid ${answers.ocasiao_especial === opt ? "#0D3B8C" : "#E2E8F0"}`, background: answers.ocasiao_especial === opt ? "#EFF6FF" : "white", cursor: "pointer", fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>
            {opt.startsWith("Sim") ? "Sim, vou comemorar!" : "Nao, viagem normal"}
          </button>
        ))}
      </div>
      {answers.ocasiao_especial?.startsWith("Sim") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Qual e a ocasiao especial?" value={answers.ocasiao_detalhe || ""} onChange={v => update("ocasiao_detalhe", v)} placeholder="Ex: aniversario de 50 anos, pedido de casamento, lua de mel..." />
          <SingleDatePicker label="Data da ocasiao" value={answers.ocasiao_data || ""} onChange={v => update("ocasiao_data", v)} placeholder="Selecione a data" />
        </div>
      )}
    </div>
  );

  if (stepId === 10) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>Uma estimativa nos ajuda a montar a proposta ideal para voce.</p>
      {ORCAMENTOS.map(o => (
        <button key={o.id} onClick={() => update("orcamento", o.label)}
          style={{ padding: "14px 18px", borderRadius: 12, border: `2px solid ${answers.orcamento === o.label ? "#0D3B8C" : "#E2E8F0"}`, background: answers.orcamento === o.label ? "#EFF6FF" : "white", cursor: "pointer", fontWeight: answers.orcamento === o.label ? 700 : 500, fontSize: 14, textAlign: "left", color: answers.orcamento === o.label ? "#0D3B8C" : "#334155" }}>
          {answers.orcamento === o.label ? "✓ " : ""}{o.label}
        </button>
      ))}
    </div>
  );

  if (stepId === 11) return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 600, color: "#334155", display: "block", marginBottom: 8 }}>Algum detalhe importante sobre a sua viagem?</label>
      <textarea value={answers.extras || ""} onChange={e => update("extras", e.target.value)}
        placeholder="Ex: tenho restricao alimentar, prefiro passeios tranquilos, viajamos com pessoa com mobilidade reduzida, quero visitar vinicolas..."
        style={{ width: "100%", minHeight: 120, border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════
// SEND TO CONSULTANT
// ═══════════════════════════════════════════════════════
async function sendToConsultant({ answers, result }) {
  const emailBody = `NOVA SOLICITACAO DE ROTEIRO - Brasileiros no Uruguai
Nome: ${answers.nome} | WhatsApp: ${answers.whatsapp} | E-mail: ${answers.email}
Origem: ${answers.origem} | Perfil: ${answers.perfil}
Adultos: ${answers.adultos} | Criancas: ${answers.criancas}
Datas: ${answers.data_ida ? answers.data_ida + " a " + answers.data_volta : answers.dias_total || "flexivel"}
Cidades: ${JSON.stringify(answers.cidades)}
Hotel: ${answers.hotel_estrelas} estrelas
Passeios: ${(answers.passeios || []).join(", ")}
Ocasiao: ${answers.ocasiao_detalhe || "nenhuma"}
Orcamento: ${answers.orcamento}
Obs: ${answers.extras || "nenhuma"}

PRE-ROTEIRO:
${result}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: `Confirme de forma breve e cordial que o pre-roteiro foi enviado para o e-mail do cliente (${answers.email}) e que a Consultora Especialista recebeu uma copia para dar continuidade. Assine como Brasileiros no Uruguai. Responda em portugues sem usar travessao.\n\n${emailBody}` }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text || "Solicitacao enviada com sucesso!";
  } catch {
    return "Solicitacao registrada! A Consultora Especialista entrara em contato em breve.";
  }
}

// ═══════════════════════════════════════════════════════
// WIZARD SCREEN
// ═══════════════════════════════════════════════════════
const STEP_CONFIG = [
  { title: "Vamos comecar?", sub: "Nos informe quem e voce" },
  { title: "Perfil da viagem", sub: "Como sera o grupo?" },
  { title: "Tamanho do grupo", sub: "Quantos vao viajar?" },
  { title: "Quando viaja?", sub: "Datas ou duracao planejada" },
  { title: "Cidades do roteiro", sub: "Quais cidades incluir?" },
  { title: "Estilo de hospedagem", sub: "Nivel de conforto desejado" },
  { title: "Preferencia de hotel", sub: "Hotel ja definido ou quer sugestoes?" },
  { title: "Passeios e Experiencias", sub: "O que voce quer fazer no Uruguai?" },
  { title: "Vai comemorar uma data especial?", sub: "Informe qual e a ocasiao e a data" },
  { title: "Orcamento", sub: "Faixa de investimento" },
  { title: "Informacoes adicionais", sub: "Algum detalhe importante?" },
];

function WizardScreen({ answers, setAnswers, onFinish, chatOpen, setChatOpen, chatMessages, chatInput, setChatInput, chatLoading, sendChat }) {
  const [step, setStep] = useState(0);
  const totalSteps = 11;
  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const canAdvance = () => {
    if (step === 0) return answers.nome?.trim() && answers.whatsapp?.trim() && answers.email?.trim();
    if (step === 1) return answers.perfil;
    if (step === 2) return (answers.adultos || 0) >= 1;
    if (step === 3) return answers.datas_definidas !== undefined;
    if (step === 4) return Object.keys(answers.cidades || {}).length > 0;
    if (step === 5) return answers.hotel_estrelas;
    if (step === 6) return answers.hotel_opcao;
    return true;
  };

  const { title, sub } = STEP_CONFIG[step];
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BNULogo size={36} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, color: "#0D3B8C" }}>Criador de Roteiro</div>
            <div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 0.5 }}>Brasileiros no Uruguai</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Etapa {step + 1} de {totalSteps}</div>
      </div>
      <div style={{ height: 4, background: "#E2E8F0" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0D3B8C, #1B6E3C)", transition: "width 0.4s ease", borderRadius: "0 2px 2px 0" }} />
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px 120px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {[...Array(totalSteps)].map((_, i) => (
              <div key={i} style={{ flex: 1, minWidth: 16, height: 4, borderRadius: 2, background: i <= step ? "#0D3B8C" : "#E2E8F0", transition: "background 0.3s" }} />
            ))}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "16px 0 6px" }}>{title}</h2>
          <p style={{ fontSize: 15, color: "#64748B", margin: 0 }}>{sub}</p>
        </div>
        <StepContent stepId={step + 1} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #E2E8F0", padding: "16px 24px", display: "flex", gap: 12, zIndex: 50 }}>
        {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, maxWidth: 120, padding: "14px", border: "2px solid #E2E8F0", borderRadius: 12, background: "white", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "#334155" }}>Voltar</button>}
        {step < totalSteps - 1
          ? <button onClick={() => canAdvance() && setStep(s => s + 1)} disabled={!canAdvance()}
              style={{ flex: 1, padding: "14px", border: "none", borderRadius: 12, background: canAdvance() ? "linear-gradient(135deg, #0D3B8C, #1E5CB5)" : "#E2E8F0", cursor: canAdvance() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 15, color: canAdvance() ? "white" : "#94A3B8", transition: "all 0.2s" }}>
              Proximo
            </button>
          : <button onClick={onFinish} style={{ flex: 1, padding: "14px", border: "none", borderRadius: 12, background: "linear-gradient(135deg, #1B6E3C, #22C55E)", cursor: "pointer", fontWeight: 800, fontSize: 16, color: "white" }}>
              Gerar Meu Roteiro!
            </button>
        }
      </div>
      <button onClick={() => setChatOpen(!chatOpen)}
        style={{ position: "fixed", bottom: 90, right: 20, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #0D3B8C, #1E5CB5)", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,59,140,0.4)", fontSize: 24, zIndex: 999, display: chatOpen ? "none" : "flex", alignItems: "center", justifyContent: "center", animation: step === 0 ? "chatPulse 1.8s ease-in-out infinite" : "none" }}>
        💬
      </button>
      <style>{`@keyframes chatPulse { 0%,100%{box-shadow:0 4px 20px rgba(13,59,140,0.4)} 50%{box-shadow:0 4px 32px rgba(13,59,140,0.9), 0 0 0 10px rgba(13,59,140,0.15)} }`}</style>
      {chatOpen && <ChatPanel messages={chatMessages} input={chatInput} setInput={setChatInput} loading={chatLoading} onSend={sendChat} endRef={chatEndRef} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESULT SCREEN
// ═══════════════════════════════════════════════════════
function ResultScreen({ result, generating, answers, onBack, chatOpen, setChatOpen, chatMessages, chatInput, setChatInput, chatLoading, sendChat }) {
  const chatEndRef = useRef(null);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendMessage, setSendMessage] = useState("");
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSend = async () => {
    setSendStatus("sending");
    const msg = await sendToConsultant({ answers, result });
    setSendMessage(msg);
    setSendStatus("sent");
  };

  const PERFIS_MAP = Object.fromEntries(PERFIS.map(p => [p.id, p]));
  const cidadeNames = Object.keys(answers.cidades || {}).map(k => CIDADES_OPTIONS.find(c => c.id === k)?.nome || k).join(", ");

  // Split result into roteiro and orcamento sections for different rendering
  let roteiroText = result || "";
  let orcamentoText = "";
  if (result) {
    const orcIdx = result.search(/##.*[Oo]r[cç]amento|##.*Resumo.*Financeiro|##.*Valor.*Total/i);
    if (orcIdx > -1) {
      roteiroText = result.slice(0, orcIdx);
      orcamentoText = result.slice(orcIdx);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #0D3B8C, #1B6E3C)", padding: "24px 20px", textAlign: "center", color: "white" }}>
        <div style={{ display: "inline-block", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", width: 52, height: 52, marginBottom: 12 }}>
          <img src={FAVICON_SRC} alt="BNU" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 2px" }}>Criador de Roteiro</h1>
        <p style={{ fontSize: 12, margin: "0 0 8px", opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Brasileiros no Uruguai</p>
        <p style={{ opacity: 0.9, margin: 0, fontSize: 14 }}>
          {answers.nome ? `Ola, ${answers.nome.split(" ")[0]}! ` : ""}Seu pre-roteiro personalizado esta pronto
        </p>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px 120px" }}>
        {generating ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16, animation: "bounce 1.2s ease-in-out infinite" }}>🗺️</div>
            <h2 style={{ color: "#0D3B8C", marginBottom: 10, fontSize: 22 }}>Montando seu roteiro perfeito...</h2>
            <p style={{ color: "#64748B", fontSize: 15, lineHeight: 1.7 }}>Estamos analisando suas preferencias,<br/>calculando o orcamento e preparando tudo com carinho!</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: "#0D3B8C", animation: "bounce 1s infinite", animationDelay: `${i*0.3}s` }} />)}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
              {["🏨 Hospedagem", "🎫 Passeios", "🚗 Transfers", "💰 Orcamento"].map((item, i) => (
                <div key={i} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 100, padding: "6px 14px", fontSize: 13, color: "#64748B", animation: `fadeIn 0.5s ease ${i*0.3}s both` }}>{item}</div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* chips */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              {[
                [PERFIS_MAP[answers.perfil]?.emoji || "👥", PERFIS_MAP[answers.perfil]?.label || "Grupo"],
                ["👤", `${(answers.adultos||0) + (answers.criancas||0)} pessoa(s)`],
                ["📍", cidadeNames || "Uruguai"],
                ["🏨", answers.hotel_estrelas ? `Hotel ${answers.hotel_estrelas} estrelas` : "Hotel"],
              ].map(([emoji, label], i) => (
                <div key={i} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 100, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{emoji}</span><span>{label}</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <TripTimeline answers={answers} />

            {/* Roteiro */}
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: "28px 24px", marginBottom: 20 }}>
              <MarkdownText text={roteiroText} noBold={true} />
            </div>

            {/* Orcamento destacado */}
            {orcamentoText && (
              <div style={{ background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)", border: "2px solid #0D3B8C", borderRadius: 16, padding: "28px 24px", marginBottom: 20 }}>
                <MarkdownText text={orcamentoText} noBold={false} />
                <div style={{ marginTop: 20, background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                    Este e um roteiro sugerido com valores estimados. O valor real sera calculado pela consultora no momento da proposta.
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            {sendStatus === "sent" ? (
              <div style={{ background: "linear-gradient(135deg, #1B6E3C, #22C55E)", borderRadius: 16, padding: "24px", textAlign: "center", color: "white" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>Solicitacao enviada!</h3>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14, lineHeight: 1.6 }}>{sendMessage}</p>
              </div>
            ) : (
              <div style={{ background: "white", border: "2px solid #0D3B8C", borderRadius: 16, padding: "28px 24px" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#0D3B8C", fontWeight: 800 }}>Gostou dos valores e condições da sua viagem?</h3>
                <p style={{ margin: "0 0 24px", color: "#334155", fontSize: 16, lineHeight: 1.7 }}>Se não tiver mais dúvidas, siga para o próximo passo enviando o seu roteiro para a nossa consultora e ela entrará em contato para prosseguir com a contratação. Você também pode alterar o roteiro ou tirar suas dúvidas antes de enviar o roteiro para a consultora.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button onClick={handleSend} disabled={sendStatus === "sending"}
                    style={{ width: "100%", padding: "16px 20px", border: "none", borderRadius: 12, background: sendStatus === "sending" ? "#E2E8F0" : "linear-gradient(135deg, #0D3B8C, #1B6E3C)", color: sendStatus === "sending" ? "#94A3B8" : "white", fontWeight: 800, cursor: sendStatus === "sending" ? "not-allowed" : "pointer", fontSize: 16 }}>
                    {sendStatus === "sending" ? "Enviando..." : "✅ Sim. Seguir para próximo passo"}
                  </button>
                  <button onClick={() => setChatOpen(true)}
                    style={{ width: "100%", padding: "16px 20px", border: "2px solid #F59E0B", borderRadius: 12, background: "#FFFBEB", color: "#92400E", fontWeight: 700, cursor: "pointer", fontSize: 16 }}>
                    💬 Tirar Dúvidas com o Rodrigo
                  </button>
                  <button onClick={onBack} style={{ width: "100%", padding: "14px 20px", border: "2px solid #0D3B8C", borderRadius: 12, background: "#EFF6FF", color: "#0D3B8C", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
                    Revisar o meu roteiro
                  </button>
                </div>
              </div>
            )}

            <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 20 }}>
              Pre-roteiro orientativo. Valores finais confirmados pela consultora.
            </p>
          </div>
        )}
      </div>

      <button onClick={() => setChatOpen(!chatOpen)}
        style={{ position: "fixed", bottom: 24, right: 20, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #0D3B8C, #1E5CB5)", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,59,140,0.4)", fontSize: 24, zIndex: 999, display: chatOpen ? "none" : "flex", alignItems: "center", justifyContent: "center" }}>
        💬
      </button>
      {chatOpen && <ChatPanel messages={chatMessages} input={chatInput} setInput={setChatInput} loading={chatLoading} onSend={sendChat} endRef={chatEndRef} onClose={() => setChatOpen(false)} />}

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [answers, setAnswers] = useState({ adultos: 1, criancas: 0, passeios: [] });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Ola! Sou o Rodrigo, consultor da Brasileiros no Uruguai.\n\nPode me perguntar qualquer coisa sobre a viagem enquanto preenche o formulario!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const sendChat = async (msg) => {
    if (!msg.trim() || chatLoading) return;
    const userMsg = { role: "user", content: msg };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: KNOWLEDGE, messages: newHistory.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || "Nao consegui responder agora. Tente novamente!" }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Ops! Problema momentaneo. Tente novamente!" }]);
    }
    setChatLoading(false);
  };

  const generateResult = async () => {
    setScreen("result");
    setGenerating(true);
    const total = (answers.adultos || 1) + (answers.criancas || 0);
    const cidadesStr = Object.entries(answers.cidades || {}).map(([k, v]) => `${CIDADES_OPTIONS.find(c => c.id === k)?.nome || k}: ${v} noites`).join(", ");

    // Calculate total available days (each night = 1 full day, plus arrival/departure days)
    const parseDate = (str) => { if (!str) return null; const [d,m,y]=str.split("/"); return new Date(Number(y),Number(m)-1,Number(d)); };
    const tripStart = parseDate(answers.data_ida);
    const tripEnd = parseDate(answers.data_volta);
    const totalNights = tripStart && tripEnd
      ? Math.round((tripEnd - tripStart) / 86400000)
      : (answers.dias_total > 1 ? answers.dias_total - 1 : 0);
    // Days available for passeios = total nights (arrival/departure days not used for full-day tours)
    const diasDisponiveisParaPasseios = totalNights;
    const passeiosIds = answers.passeios || [];
    // Each passeio occupies exactly 1 full day
    const passeiosValidos = passeiosIds.slice(0, Math.max(0, diasDisponiveisParaPasseios));
    const passeiosCortados = passeiosIds.slice(Math.max(0, diasDisponiveisParaPasseios));
    const passeiosSel = passeiosValidos.map(id => PASSEIOS_OPCOES.find(p => p.id === id)?.nome).filter(Boolean).join(", ");
    const passeiosNaoEncaixados = passeiosCortados.map(id => PASSEIOS_OPCOES.find(p => p.id === id)?.nome).filter(Boolean).join(", ");

    const avisoPasseios = passeiosNaoEncaixados ? `ATENCAO: Os seguintes passeios NAO foram incluidos no roteiro pois nao ha dias suficientes: ${passeiosNaoEncaixados}. Informe isso claramente ao cliente no inicio do Pre-Roteiro com um aviso de destaque.` : "";

    const prompt = `Crie um PRE-ROTEIRO dia a dia e um PRE-ORCAMENTO completo.

DADOS DA VIAGEM:
Nome: ${answers.nome}
Perfil: ${PERFIS.find(p => p.id === answers.perfil)?.label || answers.perfil || "nao informado"}
Adultos: ${answers.adultos || 1} | Criancas: ${answers.criancas || 0} | Total: ${total} pessoas
Datas: ${answers.data_ida ? answers.data_ida + " a " + answers.data_volta : (answers.dias_total ? answers.dias_total + " dias (" + totalNights + " noites)" : "flexivel")}
Total de noites: ${totalNights || "nao informado"}
Cidades e noites: ${cidadesStr || "a definir"}
Hotel: ${answers.hotel_estrelas ? answers.hotel_estrelas + " estrelas" : "nao informado"} | ${answers.hotel_nome || answers.hotel_opcao || "quer sugestoes"}
PASSEIOS QUE CABEM NO ROTEIRO (um por dia, maximo ${diasDisponiveisParaPasseios} passeio${diasDisponiveisParaPasseios !== 1 ? "s" : ""}): ${passeiosSel || "nenhum selecionado"}
${avisoPasseios}
Ocasiao especial: ${answers.ocasiao_especial?.startsWith("Sim") ? (answers.ocasiao_detalhe || "sim") + " em " + (answers.ocasiao_data || "data a confirmar") : "nenhuma"}
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

Calcule o orcamento apenas com os passeios que cabem no roteiro (nao incluir os que foram cortados). Use valores exatos da base de dados.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4000,
          system: KNOWLEDGE + "\n\nREGRAS ABSOLUTAS: (1) Cada passeio ocupa 1 dia inteiro — NUNCA coloque 2 passeios no mesmo dia. (2) Dia 1 (chegada) e ultimo dia (partida) nao tem passeio. (3) Apresente APENAS os passeios listados em PASSEIOS QUE CABEM NO ROTEIRO. NUNCA invente atividades, restaurantes ou outras atracoes. (4) Nao use negrito no Pre-Roteiro. (5) Use emojis nos bullets. (6) Responda em portugues sem travessao. (7) Valores de hospedagem sao SEMPRE aproximados — indicar isso claramente. (8) NUNCA sugira hoteis especificos — isso e responsabilidade exclusiva da Consultora Especialista.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      setResult(data.content?.[0]?.text || "Nao foi possivel gerar o roteiro. Entre em contato com nossa equipe.");
    } catch {
      setResult("Ocorreu um erro. Entre em contato com nossa equipe.");
    }
    setGenerating(false);
  };

  const sharedChatProps = { chatOpen, setChatOpen, chatMessages, chatInput, setChatInput, chatLoading, sendChat };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      `}</style>
      {screen === "welcome" && <WelcomeScreen onStart={() => setScreen("wizard")} />}
      {screen === "wizard" && <WizardScreen answers={answers} setAnswers={setAnswers} onFinish={generateResult} {...sharedChatProps} />}
      {screen === "result" && <ResultScreen result={result} generating={generating} answers={answers} onBack={() => setScreen("wizard")} {...sharedChatProps} />}
    </>
  );
}