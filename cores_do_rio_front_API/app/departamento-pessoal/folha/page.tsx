"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess, toastError } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_FOLHA ?? "";
const SUPABASE_BUCKET = "folha-confirmacoes";

type Status = "pendente" | "concluido" | "atrasado";

interface Confirmacao {
  id: string; confirmado_por: string; arquivo_nome: string | null;
  arquivo_url: string | null; confirmado_em: string;
}
interface Justificativa {
  id: string; justificativa: string; justificado_por: string; created_at: string;
}
interface Etapa {
  id: string; tipo_workflow: string; ciclo_ref: string;
  etapa_nome: string; etapa_label: string; dept_responsavel: string;
  data_prevista: string; status: Status;
  folha_confirmacoes: Confirmacao[];
  folha_justificativas: Justificativa[];
}

const WORKFLOW_LABEL: Record<string, string> = {
  pagamento_1: "Pagamento 1 — dia 08",
  pagamento_2: "Pagamento 2 — dia 25",
  passagens:   "Passagens",
};
const DEPT_LABEL: Record<string, string> = {
  dp: "Dep. Pessoal", beneficios: "Benefícios",
};
const DEPT_FUNCAO: Record<string, string> = {
  dp: "rh",
  beneficios: "beneficios",
};

const STATUS_CFG: Record<Status, { label: string; dot: string; badge: string }> = {
  pendente:  { label: "Pendente",  dot: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-700"  },
  concluido: { label: "Concluído", dot: "bg-green-500",  badge: "bg-green-50 text-green-700"    },
  atrasado:  { label: "Atrasado",  dot: "bg-red-500",    badge: "bg-red-50 text-red-700"        },
};

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const BTN_PRIMARY = "w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white py-2.5 rounded-lg text-sm font-medium transition-colors";

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function diffDias(iso: string): number {
  const hoje = new Date(new Date().toISOString().split("T")[0] + "T12:00:00Z");
  const prev = new Date(iso + "T12:00:00Z");
  return Math.floor((prev.getTime() - hoje.getTime()) / 86400000);
}
function getInicioUltimas4Quinzenas(): string {
  const hoje = new Date();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth();
  let isSegunda = hoje.getDate() > 15;
  for (let i = 0; i < 3; i++) {
    if (isSegunda) { isSegunda = false; }
    else { mes--; if (mes < 0) { mes = 11; ano--; } isSegunda = true; }
  }
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${isSegunda ? "16" : "01"}`;
}

const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
function generatePeriods() {
  const hoje = new Date();
  const list: { label: string; value: string | null }[] = [{ label: "Recentes", value: null }];
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    list.push({ label: `${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, value });
  }
  return list;
}

interface ConfirmarModalProps {
  etapa: Etapa;
  userEmail: string;
  onClose: () => void;
  onDone: () => void;
}

function ConfirmarModal({ etapa, userEmail, onClose, onDone }: ConfirmarModalProps) {
  const [file,      setFile]      = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleConfirmar = async () => {
    if (!file) { setErro("Selecione o arquivo comprovante antes de confirmar."); return; }
    setErro(null);
    setLoading(true);
    try {
      let arquivo_url: string | null  = null;
      let arquivo_nome: string | null = null;

      if (file) {
        const supabase = createClient();
        const ext  = file.name.split(".").pop();
        const path = `${etapa.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file, { upsert: true });
        if (upErr) throw new Error(`Upload: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
        arquivo_url  = publicUrl;
        arquivo_nome = file.name;
      }

      const r = await fetch(`${API}/etapas/${etapa.id}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmado_por: userEmail, arquivo_nome, arquivo_url }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${r.status}`);
      }
      toastSuccess("Etapa confirmada com sucesso!");
      onDone();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao confirmar.");
      setErro(e instanceof Error ? e.message : "Erro ao confirmar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-zinc-900">Confirmar Etapa</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{etapa.etapa_label} — {etapa.ciclo_ref}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Comprovante (PDF ou Excel) <span className="text-red-500">*</span>
            </label>
            <div
              className="border-2 border-dashed border-zinc-200 rounded-xl p-5 text-center cursor-pointer hover:border-orange-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <p className="text-sm text-zinc-700 font-medium">{file.name}</p>
              ) : (
                <>
                  <svg className="mx-auto mb-2 text-zinc-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p className="text-sm text-zinc-400">Clique para selecionar arquivo</p>
                  <p className="text-xs text-zinc-300 mt-0.5">PDF, XLS, XLSX</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xls,.xlsx"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button onClick={handleConfirmar} disabled={loading || !file} className={BTN_PRIMARY}>
            {loading ? "Confirmando..." : !file ? "Selecione o comprovante" : "Marcar como Concluído ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface JustificarModalProps {
  etapa: Etapa;
  userEmail: string;
  onClose: () => void;
  onDone: () => void;
}

function JustificarModal({ etapa, userEmail, onClose, onDone }: JustificarModalProps) {
  const [texto,   setTexto]   = useState("");
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState<string | null>(null);

  const handleEnviar = async () => {
    if (!texto.trim()) { setErro("Informe a justificativa."); return; }
    setErro(null); setLoading(true);
    try {
      const r = await fetch(`${API}/etapas/${etapa.id}/justificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: texto.trim(), justificado_por: userEmail }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${r.status}`);
      }
      toastSuccess("Justificativa enviada com sucesso!");
      onDone();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao enviar.");
      setErro(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-zinc-900">Justificar Atraso</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{etapa.etapa_label} — {etapa.ciclo_ref}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Motivo do atraso</label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={4}
              className={`${INPUT} resize-none`}
              placeholder="Descreva o motivo do atraso..."
            />
          </div>
          <button onClick={handleEnviar} disabled={loading || !texto.trim()} className={BTN_PRIMARY}>
            {loading ? "Enviando..." : "Enviar Justificativa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EtapaCard({ etapa, userEmail, userFuncao, onRefresh }: { etapa: Etapa; userEmail: string; userFuncao: string; onRefresh: () => void }) {
  const [modal, setModal] = useState<"confirmar" | "justificar" | null>(null);
  const conf       = etapa.folha_confirmacoes[0];
  const just       = etapa.folha_justificativas[0];
  const s          = STATUS_CFG[etapa.status];
  const dias       = diffDias(etapa.data_prevista);
  const canConfirm = userFuncao === "desenvolvedor" || DEPT_FUNCAO[etapa.dept_responsavel] === userFuncao;

  const isUrgente = etapa.status === "atrasado" || (etapa.status === "pendente" && dias <= 1);

  return (
    <>
      <div className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
        etapa.status === "atrasado" ? "border-red-200 pulse-danger" :
        etapa.status === "concluido" ? "border-green-100" :
        isUrgente ? "border-orange-200 pulse-danger" : "border-zinc-200"
      }`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <span className="text-xs text-zinc-400">{DEPT_LABEL[etapa.dept_responsavel] ?? etapa.dept_responsavel}</span>
            </div>
            <p className="font-semibold text-zinc-900 text-sm">{etapa.etapa_label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{WORKFLOW_LABEL[etapa.tipo_workflow]} · {etapa.ciclo_ref}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-medium text-zinc-700">{fmtDate(etapa.data_prevista)}</p>
            {etapa.status === "pendente" && (
              <p className={`text-xs mt-0.5 ${dias < 0 ? "text-red-500" : dias <= 1 ? "text-orange-500" : "text-zinc-400"}`}>
                {dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "Hoje!" : `${dias}d restantes`}
              </p>
            )}
          </div>
        </div>

        {conf && (
          <div className="mt-3 bg-green-50 rounded-lg px-3 py-2 text-xs text-green-700 flex items-center justify-between gap-2">
            <span>Confirmado por <strong>{conf.confirmado_por}</strong></span>
            {conf.arquivo_url && (
              <a href={conf.arquivo_url} target="_blank" rel="noreferrer" className="underline font-medium text-green-800">
                {conf.arquivo_nome ?? "Ver arquivo"}
              </a>
            )}
          </div>
        )}

        {just && !conf && (
          <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700">
            <span className="font-medium">Justificativa enviada:</span> {just.justificativa}
          </div>
        )}

        {etapa.status !== "concluido" && (canConfirm || (etapa.status === "atrasado" && !just)) && (
          <div className="flex gap-2 mt-3">
            {canConfirm && (
              <button
                onClick={() => setModal("confirmar")}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium py-2 rounded-lg transition-colors"
              >
                Marcar OK
              </button>
            )}
            {etapa.status === "atrasado" && !just && canConfirm && (
              <button
                onClick={() => setModal("justificar")}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium py-2 rounded-lg border border-red-200 transition-colors"
              >
                Justificar Atraso
              </button>
            )}
          </div>
        )}
      </div>

      {modal === "confirmar" && (
        <ConfirmarModal
          etapa={etapa}
          userEmail={userEmail}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); onRefresh(); }}
        />
      )}
      {modal === "justificar" && (
        <JustificarModal
          etapa={etapa}
          userEmail={userEmail}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); onRefresh(); }}
        />
      )}
    </>
  );
}

export default function FolhaDPPage() {
  const [etapas,  setEtapas]  = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState<string | null>(null);
  const [email,   setEmail]   = useState("");
  const [funcao,  setFuncao]  = useState("");
  const [filtro,  setFiltro]  = useState<"todos" | Status>("todos");
  const [periodo, setPeriodo] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setFuncao(data.user?.user_metadata?.funcao ?? "");
    });
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    // DP vê tarefas de dp E beneficios
    Promise.all([
      fetch(`${API}/etapas?dept=dp`).then(r => r.json()),
      fetch(`${API}/etapas?dept=beneficios`).then(r => r.json()),
    ])
      .then(([d1, d2]) => {
        const todas = [...(d1.data ?? []), ...(d2.data ?? [])];
        todas.sort((a: Etapa, b: Etapa) => a.data_prevista.localeCompare(b.data_prevista));
        setEtapas(todas);
        setErro(null);
      })
      .catch(() => setErro("Erro ao carregar tarefas."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const inicio4Q   = getInicioUltimas4Quinzenas();
  const visiveis   = periodo
    ? etapas.filter(e => e.data_prevista.startsWith(periodo))
    : etapas.filter(e => e.data_prevista >= inicio4Q);
  const pendentes  = visiveis.filter(e => e.status === "pendente").length;
  const atrasadas  = visiveis.filter(e => e.status === "atrasado").length;
  const filtradas  = filtro === "todos" ? visiveis : visiveis.filter(e => e.status === filtro);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Folha & Passagens</h1>
          <p className="text-zinc-400 mt-1 text-sm">Tarefas do Departamento Pessoal e Benefícios</p>
        </div>
        <div className="flex items-center gap-2">
          {atrasadas > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
            </span>
          )}
          {pendentes > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium rounded-full">
              {pendentes} pendente{pendentes > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Seletor de período */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {generatePeriods().map(p => (
          <button
            key={p.value ?? "recentes"}
            onClick={() => setPeriodo(p.value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              periodo === p.value
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {(["todos", "pendente", "atrasado", "concluido"] as const).map(v => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtro === v
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {v === "todos" ? "Todas" : v === "pendente" ? "Pendentes" : v === "atrasado" ? "Atrasadas" : "Concluídas"}
          </button>
        ))}
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{erro}</div>}

      {loading ? (
        <div className="flex justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">
          {filtro === "todos" ? "Nenhuma tarefa gerada. O sistema gera automaticamente no início de cada período." : "Nenhuma tarefa com esse status."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(e => (
            <EtapaCard key={e.id} etapa={e} userEmail={email} userFuncao={funcao} onRefresh={carregar} />
          ))}
        </div>
      )}
    </div>
  );
}
