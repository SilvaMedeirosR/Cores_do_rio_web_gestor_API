"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

const ETAPA_LABELS: Record<string, string> = {
  massa_parede: "Massa de Parede",
  massa_teto:   "Massa de Teto",
  lixacao:      "Lixação",
  pintura:      "Pintura",
  acabamento:   "Acabamento",
};

const ETAPAS = ["massa_parede", "massa_teto", "lixacao", "pintura", "acabamento"];

const TIPO_LABELS: Record<string, string> = {
  sala: "Sala", quarto: "Quarto", banheiro: "Banheiro", suite: "Suíte",
  varanda: "Varanda", lavatorio: "Lavatório", circulacao: "Circulação",
  escritorio: "Escritório", area_tecnica: "Área Técnica", escada: "Escada",
  corredor: "Corredor", casa_maquinas: "Casa de Máquinas", casa_exaustao: "Casa de Exaustão",
  estacionamento: "Estacionamento", garagem: "Garagem", deposito: "Depósito",
  area_lazer: "Área de Lazer",
};

function calcArea(c: any): { paredes: number; teto: number } {
  const paredes = Array.isArray(c.paredes) && c.paredes.length > 0
    ? c.paredes.reduce((s: number, p: any) => s + Number(p.m2), 0)
    : Number(c.parede1_m2 ?? 0) + Number(c.parede2_m2 ?? 0) + Number(c.parede3_m2 ?? 0) + Number(c.parede4_m2 ?? 0);
  const teto = Array.isArray(c.tetos) && c.tetos.length > 0
    ? c.tetos.reduce((s: number, t: any) => s + Number(t.m2), 0)
    : Number(c.teto_m2 ?? 0);
  return { paredes, teto };
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtM2(v: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " m²";
}

function fmtDate(d: string | null) {
  if (!d) return "A definir";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function fmtCNPJ(v: string | null) {
  if (!v) return "—";
  const n = v.replace(/\D/g, "");
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || v;
}

function today() {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

interface Comodo {
  tipo: string; nome: string | null;
  paredes: { m2: number }[]; tetos: { m2: number }[];
  parede1_m2: number; parede2_m2: number; parede3_m2: number; parede4_m2: number; teto_m2: number;
}
interface Apartamento {
  id: string; nome: string | null; numero: number | null; orcamento_total: number;
  apartamento_tipos: { nome: string } | null;
  comodos: Comodo[];
}
interface Pavimento {
  id: string; nome: string; numero: number; tipo: string; orcamento_total: number;
  comodos: Comodo[]; apartamentos: Apartamento[];
}
interface Obra {
  id: string; nome: string; local: string | null;
  data_inicio: string | null; previsao_conclusao: string | null;
  empreiteiras: { nome: string; cnpj: string | null } | null;
  empreiteira: string | null;
  obra_precos: { etapa: string; preco_m2: number }[];
  pavimentos: Pavimento[];
  orcamento_total: number;
}

function ComodoRow({ c }: { c: Comodo }) {
  const { paredes, teto } = calcArea(c);
  if (paredes === 0 && teto === 0) return null;
  return (
    <tr style={{ borderBottom: "1px solid #f4f4f5" }}>
      <td style={{ padding: "4px 8px", fontSize: 12, color: "#52525b" }}>{TIPO_LABELS[c.tipo] ?? c.tipo}</td>
      <td style={{ padding: "4px 8px", fontSize: 12, color: "#71717a" }}>{c.nome || "—"}</td>
      <td style={{ padding: "4px 8px", fontSize: 12, color: "#52525b", textAlign: "right" }}>{paredes > 0 ? fmtM2(paredes) : "—"}</td>
      <td style={{ padding: "4px 8px", fontSize: 12, color: "#52525b", textAlign: "right" }}>{teto > 0 ? fmtM2(teto) : "—"}</td>
      <td style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, color: "#18181b", textAlign: "right" }}>{fmtM2(paredes + teto)}</td>
    </tr>
  );
}

export default function PropostaPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const id           = Array.isArray(params.id) ? params.id[0] : params.id;
  const lucro        = parseFloat(searchParams.get("lucro") ?? "0") || 0;

  const [obra, setObra]   = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/obras/${id}`)
      .then(r => r.json())
      .then(j => { if (j.data) setObra(j.data); else setErro("Obra não encontrada"); })
      .catch(() => setErro("Erro ao carregar obra"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9" }}>
      <p style={{ color: "#71717a", fontSize: 14 }}>Carregando proposta...</p>
    </div>
  );

  if (erro || !obra) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9" }}>
      <p style={{ color: "#ef4444", fontSize: 14 }}>{erro ?? "Obra não encontrada"}</p>
    </div>
  );

  const construtora = obra.empreiteiras ?? (obra.empreiteira ? { nome: obra.empreiteira, cnpj: null } : null);
  const precoMap    = Object.fromEntries(obra.obra_precos.map(p => [p.etapa, Number(p.preco_m2)]));

  // Calcular metragens totais
  let totalParedes = 0, totalTeto = 0;
  function somarComodos(comodos: Comodo[]) {
    for (const c of comodos) {
      const { paredes, teto } = calcArea(c);
      totalParedes += paredes;
      totalTeto    += teto;
    }
  }
  for (const pav of obra.pavimentos) {
    somarComodos(pav.comodos);
    for (const apt of pav.apartamentos) somarComodos(apt.comodos);
  }
  const totalArea = totalParedes + totalTeto;

  // Composição por etapa
  const composicao = ETAPAS.map(etapa => {
    const preco = precoMap[etapa] ?? 0;
    const m2    = etapa === "massa_parede" ? totalParedes
                : etapa === "massa_teto"   ? totalTeto
                : totalArea;
    return { etapa, preco, m2, valor: preco * m2 };
  });

  const totalMaoObra = obra.orcamento_total;
  const totalGeral   = totalMaoObra + lucro;
  const propRef      = obra.id.slice(0, 8).toUpperCase();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .contract { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 28px 40px !important; }
        }
        @page { margin: 16mm 14mm; size: A4; }
      `}</style>

      {/* Print button — hidden on print */}
      <div className="no-print" style={{ background: "#1a2a3a", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#f3ece0", fontSize: 13, fontWeight: 500 }}>Proposta — {obra.nome}</span>
        <button
          onClick={() => window.print()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <Printer size={14} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Contract document */}
      <div style={{ background: "#f4f4f5", minHeight: "100vh", padding: "32px 16px" }} className="no-print-bg">
        <div className="contract" style={{ background: "#fff", maxWidth: 820, margin: "0 auto", padding: "48px 56px", boxShadow: "0 1px 12px rgba(0,0,0,0.08)", borderRadius: 4 }}>

          {/* ── Cabeçalho ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1a2a3a", paddingBottom: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2a3a", letterSpacing: "-0.01em" }}>[RAZÃO SOCIAL]</div>
              <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>CNPJ: [CNPJ] · [ENDEREÇO]</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Proposta de Serviços</div>
              <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>Nº {propRef} · {today()}</div>
            </div>
          </div>

          {/* ── Contratante ── */}
          <div style={{ background: "#f9f9f9", border: "1px solid #e4e4e7", borderRadius: 6, padding: "14px 18px", marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Contratante</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
              <div>
                <span style={{ fontSize: 11, color: "#71717a" }}>Empresa: </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#18181b" }}>{construtora?.nome ?? "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#71717a" }}>CNPJ: </span>
                <span style={{ fontSize: 12, color: "#18181b", fontFamily: "monospace" }}>{fmtCNPJ(construtora?.cnpj ?? null)}</span>
              </div>
            </div>
          </div>

          {/* ── Objeto ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>1. Objeto</div>
            <p style={{ fontSize: 12, color: "#52525b", lineHeight: 1.7, margin: 0 }}>
              Prestação de serviços de mão de obra especializada em pintura, massa e acabamento interno, referente à obra abaixo identificada, conforme metragens e composição de preços descritos nesta proposta.
            </p>
          </div>

          {/* ── Dados da Obra ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>2. Identificação da Obra</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px" }}>
              {[
                ["Nome", obra.nome],
                ["Local", obra.local || "—"],
                ["Início previsto", fmtDate(obra.data_inicio)],
                ["Previsão de conclusão", fmtDate(obra.previsao_conclusao)],
              ].map(([label, val]) => (
                <div key={label} style={{ borderBottom: "1px dashed #e4e4e7", paddingBottom: 6 }}>
                  <div style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#18181b", marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Escopo Técnico ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>3. Escopo Técnico — Relação de Ambientes</div>

            {obra.pavimentos.map(pav => (
              <div key={pav.id} style={{ marginBottom: 16 }}>
                <div style={{ background: "#1a2a3a", color: "#f3ece0", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: "4px 4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {pav.nome}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e4e4e7", borderTop: "none" }}>
                  <thead>
                    <tr style={{ background: "#f4f4f5" }}>
                      <th style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: "#71717a", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo</th>
                      <th style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: "#71717a", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nome</th>
                      <th style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: "#71717a", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>Paredes</th>
                      <th style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: "#71717a", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>Teto</th>
                      <th style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: "#71717a", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pav.comodos.map((c, i) => <ComodoRow key={i} c={c} />)}
                    {pav.apartamentos.map(apt => {
                      const aptNome = apt.nome ?? (apt.numero != null ? `Apto ${apt.numero}` : "Apartamento");
                      const tipoNome = apt.apartamento_tipos?.nome;
                      return (
                        <>
                          <tr key={`apt-${apt.id}`} style={{ background: "#fafafa" }}>
                            <td colSpan={5} style={{ padding: "5px 8px", fontSize: 11, fontWeight: 600, color: "#3f3f46", borderBottom: "1px solid #e4e4e7", borderTop: "1px solid #e4e4e7" }}>
                              {aptNome}{tipoNome ? ` — Tipo ${tipoNome}` : ""}
                            </td>
                          </tr>
                          {apt.comodos.map((c, i) => <ComodoRow key={`${apt.id}-${i}`} c={c} />)}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* ── Resumo de Metragens ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>4. Resumo de Metragens</div>
            <table style={{ borderCollapse: "collapse", border: "1px solid #e4e4e7", width: "auto", minWidth: 280 }}>
              <tbody>
                {[
                  ["Total de paredes", fmtM2(totalParedes)],
                  ["Total de teto", fmtM2(totalTeto)],
                ].map(([label, val]) => (
                  <tr key={label} style={{ borderBottom: "1px solid #f4f4f5" }}>
                    <td style={{ padding: "6px 16px", fontSize: 12, color: "#52525b" }}>{label}</td>
                    <td style={{ padding: "6px 16px", fontSize: 12, textAlign: "right", color: "#18181b" }}>{val}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f4f4f5" }}>
                  <td style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, color: "#18181b" }}>Área total</td>
                  <td style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#18181b" }}>{fmtM2(totalArea)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Composição de Valores ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>5. Composição de Preços</div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e4e4e7" }}>
              <thead>
                <tr style={{ background: "#f4f4f5" }}>
                  {["Etapa", "Preço / m²", "m² referência", "Valor"].map(h => (
                    <th key={h} style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h === "Etapa" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {composicao.map(({ etapa, preco, m2, valor }) => (
                  <tr key={etapa} style={{ borderBottom: "1px solid #f4f4f5" }}>
                    <td style={{ padding: "6px 12px", fontSize: 12, color: "#52525b" }}>{ETAPA_LABELS[etapa]}</td>
                    <td style={{ padding: "6px 12px", fontSize: 12, color: "#52525b", textAlign: "right" }}>{fmt(preco)}</td>
                    <td style={{ padding: "6px 12px", fontSize: 12, color: "#52525b", textAlign: "right" }}>{fmtM2(m2)}</td>
                    <td style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#18181b", textAlign: "right" }}>{fmt(valor)}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f4f4f5", borderTop: "2px solid #1a2a3a" }}>
                  <td colSpan={3} style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#18181b" }}>Total de Mão de Obra</td>
                  <td style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#18181b", textAlign: "right" }}>{fmt(totalMaoObra)}</td>
                </tr>
                {lucro > 0 && (
                  <tr style={{ borderBottom: "1px solid #f4f4f5" }}>
                    <td colSpan={3} style={{ padding: "6px 12px", fontSize: 12, color: "#52525b" }}>Margem de resultado</td>
                    <td style={{ padding: "6px 12px", fontSize: 12, color: "#52525b", textAlign: "right" }}>{fmt(lucro)}</td>
                  </tr>
                )}
                <tr style={{ background: "#1a2a3a" }}>
                  <td colSpan={3} style={{ padding: "9px 12px", fontSize: 13, fontWeight: 700, color: "#f3ece0" }}>VALOR TOTAL DA PROPOSTA</td>
                  <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 700, color: "#f3ece0", textAlign: "right" }}>{fmt(totalGeral)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Condições Gerais ── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>6. Condições Gerais</div>
            <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "#52525b", lineHeight: 1.9 }}>
              <li>Esta proposta tem validade de 30 (trinta) dias corridos a partir da data de emissão.</li>
              <li>Os serviços serão executados por equipe especializada da contratada, conforme cronograma a ser acordado.</li>
              <li>Os materiais necessários à execução são de responsabilidade do contratante, salvo acordo em contrário formalizado em aditivo.</li>
              <li>Qualquer alteração de escopo será objeto de aditivo contratual, com revisão de prazo e valor.</li>
              <li>O prazo de execução poderá ser revisto em caso de impedimentos alheios à vontade da contratada, como chuvas contínuas, greves ou falta de acesso à obra.</li>
              <li>O início dos serviços está condicionado à assinatura do contrato e ao recebimento do sinal acordado.</li>
            </ol>
          </div>

          {/* ── Assinaturas ── */}
          <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 32 }}>
            <div style={{ fontSize: 12, color: "#71717a", textAlign: "center", marginBottom: 32 }}>
              Rio de Janeiro, {today()}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
              {[
                { title: "CONTRATADA", name: "[RAZÃO SOCIAL]", sub: "[Representante Legal]" },
                { title: "CONTRATANTE", name: construtora?.nome ?? "—", sub: "Representante Legal" },
              ].map(({ title, name, sub }) => (
                <div key={title} style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #18181b", paddingTop: 10, marginTop: 48 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1a2a3a", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#18181b", marginTop: 4 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#71717a" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
