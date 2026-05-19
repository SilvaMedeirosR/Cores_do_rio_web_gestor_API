"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_FOLHA ?? "";

type Status = "pendente" | "concluido" | "atrasado";

interface Confirmacao {
  id: string;
  confirmado_por: string;
  arquivo_nome: string | null;
  arquivo_url: string | null;
  confirmado_em: string;
}

interface Justificativa {
  id: string;
  justificativa: string;
  justificado_por: string;
  created_at: string;
}

interface Arquivo {
  id: string;
  confirmado_por: string;
  arquivo_nome: string;
  arquivo_url: string;
  confirmado_em: string;
  folha_etapas_ciclo: {
    tipo_workflow: string;
    ciclo_ref: string;
    etapa_label: string;
    dept_responsavel: string;
    data_prevista: string;
  };
}

interface Etapa {
  id: string;
  tipo_workflow: "pagamento_1" | "pagamento_2" | "passagens";
  ciclo_ref: string;
  etapa_nome: string;
  etapa_label: string;
  dept_responsavel: "dp" | "financeiro" | "beneficios";
  data_prevista: string;
  status: Status;
  folha_confirmacoes: Confirmacao[];
  folha_justificativas: Justificativa[];
}

const WORKFLOW_LABEL: Record<string, string> = {
  pagamento_1: "Pagamento 1 — dia 08",
  pagamento_2: "Pagamento 2 — dia 25",
  passagens:   "Passagens (Semanal)",
};

const DEPT_LABEL: Record<string, string> = {
  dp:         "Dep. Pessoal",
  financeiro: "Financeiro",
  beneficios: "Benefícios",
};

const STATUS_CFG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  pendente: { label: "Pendente",  dot: "bg-yellow-400", bg: "bg-yellow-50",  text: "text-yellow-700" },
  concluido:{ label: "Concluído", dot: "bg-green-500",  bg: "bg-green-50",   text: "text-green-700"  },
  atrasado: { label: "Atrasado",  dot: "bg-red-500",    bg: "bg-red-50",     text: "text-red-700"    },
};

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function EtapaCard({ etapa }: { etapa: Etapa }) {
  const [open, setOpen] = useState(false);
  const conf = etapa.folha_confirmacoes[0];
  const just = etapa.folha_justificativas[0];

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      etapa.status === "atrasado" ? "border-red-200 bg-red-50/30" :
      etapa.status === "concluido" ? "border-green-100" : "border-zinc-200 bg-white"
    }`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CFG[etapa.status].dot}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{etapa.etapa_label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {DEPT_LABEL[etapa.dept_responsavel]} · {fmtDate(etapa.data_prevista)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={etapa.status} />
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 py-3 space-y-3">
          {conf && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Confirmação</p>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs space-y-1">
                <p className="text-green-800"><span className="font-medium">Por:</span> {conf.confirmado_por}</p>
                <p className="text-green-700"><span className="font-medium">Em:</span> {fmtDateTime(conf.confirmado_em)}</p>
                {conf.arquivo_url && (
                  <a
                    href={conf.arquivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 font-medium underline"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {conf.arquivo_nome ?? "Ver comprovante"}
                  </a>
                )}
              </div>
            </div>
          )}

          {just && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Justificativa de Atraso</p>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs space-y-1">
                <p className="text-red-800"><span className="font-medium">Por:</span> {just.justificado_por}</p>
                <p className="text-red-700 mt-1">{just.justificativa}</p>
              </div>
            </div>
          )}

          {!conf && !just && etapa.status !== "concluido" && (
            <p className="text-xs text-zinc-400 italic">Aguardando confirmação do departamento.</p>
          )}
        </div>
      )}
    </div>
  );
}

function WorkflowSection({ titulo, etapas }: { titulo: string; etapas: Etapa[] }) {
  if (etapas.length === 0) return null;
  const concluidas = etapas.filter(e => e.status === "concluido").length;
  const atrasadas  = etapas.filter(e => e.status === "atrasado").length;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900 text-sm">{titulo}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {concluidas}/{etapas.length} concluídas
            {atrasadas > 0 && <span className="text-red-500 ml-2">· {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {etapas.map(e => (
            <div
              key={e.id}
              title={`${e.etapa_label} — ${DEPT_LABEL[e.dept_responsavel]}`}
              className={`w-3 h-3 rounded-sm ${STATUS_CFG[e.status].dot}`}
            />
          ))}
        </div>
      </div>
      <div className="divide-y divide-zinc-50">
        {etapas.map(e => (
          <EtapaCard key={e.id} etapa={e} />
        ))}
      </div>
    </div>
  );
}

function CicloLabel({ ref: cicloRef }: { ref: string }) {
  if (cicloRef.includes("-W")) {
    const [, w] = cicloRef.split("-W");
    return <span>Semana {w}</span>;
  }
  const [ano, mes] = cicloRef.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return <span>{meses[parseInt(mes) - 1]}/{ano}</span>;
}

export default function RotinaPage() {
  const [etapas,  setEtapas]  = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState<string | null>(null);
  const [filtroWf, setFiltroWf] = useState<string>("todos");
  const [aba, setAba] = useState<"rotina" | "arquivos">("rotina");
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loadingArq, setLoadingArq] = useState(false);
  const [filtroWfArq, setFiltroWfArq] = useState<string>("todos");

  const carregar = useCallback(() => {
    setLoading(true);
    fetch(`${API}/etapas`)
      .then(r => r.json())
      .then(j => { setEtapas(j.data ?? []); setErro(null); })
      .catch(() => setErro("Erro ao carregar rotina."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const carregarArquivos = useCallback(() => {
    setLoadingArq(true);
    fetch(`${API}/arquivos`)
      .then(r => r.json())
      .then(j => setArquivos(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingArq(false));
  }, []);

  useEffect(() => { if (aba === "arquivos") carregarArquivos(); }, [aba, carregarArquivos]);

  // Agrupa por ciclo_ref + tipo_workflow
  const filtradas = filtroWf === "todos" ? etapas : etapas.filter(e => e.tipo_workflow === filtroWf);

  type Ciclo = { ciclo_ref: string; workflows: Record<string, Etapa[]> };
  const ciclosMap = new Map<string, Ciclo>();

  for (const e of filtradas) {
    if (!ciclosMap.has(e.ciclo_ref)) ciclosMap.set(e.ciclo_ref, { ciclo_ref: e.ciclo_ref, workflows: {} });
    const c = ciclosMap.get(e.ciclo_ref)!;
    if (!c.workflows[e.tipo_workflow]) c.workflows[e.tipo_workflow] = [];
    c.workflows[e.tipo_workflow].push(e);
  }

  const ciclos = [...ciclosMap.values()].sort((a, b) => b.ciclo_ref.localeCompare(a.ciclo_ref));

  const totalAtrasadas  = etapas.filter(e => e.status === "atrasado").length;
  const totalPendentes  = etapas.filter(e => e.status === "pendente").length;
  const totalConcluidas = etapas.filter(e => e.status === "concluido").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">

      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "6px" }}>Rotina</h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)" }}>Workflow de folha e passagens</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 mb-6">
        {(["rotina", "arquivos"] as const).map(t => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === t
                ? "border-[#1A2A3A] text-[#1A2A3A]"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "rotina" ? "Rotina" : "Arquivos"}
          </button>
        ))}
      </div>

      {aba === "rotina" && (
        <>
          {/* KPIs resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.09)", borderTop: "2px solid #16a34a", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(26,42,58,0.05)", textAlign: "center" }}>
              <p style={{ fontSize: "1.9rem", fontWeight: 700, color: "#16a34a", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>{totalConcluidas}</p>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(26,42,58,0.38)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "6px" }}>Concluídas</p>
            </div>
            <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.09)", borderTop: "2px solid #d97706", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(26,42,58,0.05)", textAlign: "center" }}>
              <p style={{ fontSize: "1.9rem", fontWeight: 700, color: "#d97706", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>{totalPendentes}</p>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(26,42,58,0.38)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "6px" }}>Pendentes</p>
            </div>
            <div style={{
              backgroundColor: totalAtrasadas > 0 ? "rgba(239,68,68,0.04)" : "#fff",
              border: `1px solid ${totalAtrasadas > 0 ? "rgba(239,68,68,0.18)" : "rgba(26,42,58,0.09)"}`,
              borderTop: `2px solid ${totalAtrasadas > 0 ? "#dc2626" : "rgba(26,42,58,0.12)"}`,
              borderRadius: "12px", padding: "16px 18px",
              boxShadow: "0 1px 3px rgba(26,42,58,0.05)", textAlign: "center",
            }}>
              <p style={{ fontSize: "1.9rem", fontWeight: 700, color: totalAtrasadas > 0 ? "#dc2626" : "rgba(26,42,58,0.18)", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>{totalAtrasadas}</p>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(26,42,58,0.38)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "6px" }}>Atrasadas</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            {["todos", "pagamento_1", "pagamento_2", "passagens"].map(v => (
              <button
                key={v}
                onClick={() => setFiltroWf(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filtroWf === v
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {v === "todos" ? "Todos" : WORKFLOW_LABEL[v]}
              </button>
            ))}
            <button
              onClick={carregar}
              className="ml-auto p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors"
              title="Recarregar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
            </button>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-zinc-400 text-sm">Carregando rotina...</div>
          ) : ciclos.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 text-sm">Nenhuma etapa gerada ainda. O sistema gera automaticamente no início de cada período.</div>
          ) : (
            <div className="space-y-8">
              {ciclos.map(ciclo => (
                <div key={ciclo.ciclo_ref}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-zinc-200" />
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      <CicloLabel ref={ciclo.ciclo_ref} />
                    </span>
                    <div className="h-px flex-1 bg-zinc-200" />
                  </div>
                  <div className="space-y-4">
                    {Object.entries(ciclo.workflows).map(([wf, etapasList]) => (
                      <WorkflowSection
                        key={wf}
                        titulo={WORKFLOW_LABEL[wf] ?? wf}
                        etapas={etapasList}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {aba === "arquivos" && (
        <div className="space-y-6">
          {/* Filtro por workflow */}
          <div className="flex items-center gap-2 flex-wrap">
            {["todos", "pagamento_1", "pagamento_2", "passagens"].map(v => (
              <button key={v} onClick={() => setFiltroWfArq(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filtroWfArq === v ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                }`}>
                {v === "todos" ? "Todos" : WORKFLOW_LABEL[v]}
              </button>
            ))}
            <button onClick={carregarArquivos} className="ml-auto p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors" title="Recarregar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
            </button>
          </div>

          {loadingArq ? (
            <div className="flex justify-center py-12 text-zinc-400 text-sm">Carregando arquivos...</div>
          ) : (() => {
            const arqFiltrados = filtroWfArq === "todos"
              ? arquivos
              : arquivos.filter(a => a.folha_etapas_ciclo.tipo_workflow === filtroWfArq);

            if (arqFiltrados.length === 0) {
              return <div className="text-center py-12 text-zinc-400 text-sm">Nenhum arquivo enviado ainda.</div>;
            }

            // Agrupar por tipo_workflow
            const grupos: Record<string, Arquivo[]> = {};
            for (const a of arqFiltrados) {
              const wf = a.folha_etapas_ciclo.tipo_workflow;
              if (!grupos[wf]) grupos[wf] = [];
              grupos[wf].push(a);
            }

            return (
              <div className="space-y-6">
                {Object.entries(grupos).map(([wf, arqs]) => (
                  <div key={wf} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100">
                      <h3 className="font-semibold text-zinc-900 text-sm">{WORKFLOW_LABEL[wf] ?? wf}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{arqs.length} arquivo{arqs.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {arqs.map(a => (
                        <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{a.folha_etapas_ciclo.etapa_label}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {DEPT_LABEL[a.folha_etapas_ciclo.dept_responsavel]} · {a.folha_etapas_ciclo.ciclo_ref} · por {a.confirmado_por}
                            </p>
                            <p className="text-xs text-zinc-300 mt-0.5">{fmtDateTime(a.confirmado_em)}</p>
                          </div>
                          <a
                            href={a.arquivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 flex items-center gap-1.5 text-xs font-medium border border-zinc-200 hover:border-zinc-400 text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {a.arquivo_nome}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
