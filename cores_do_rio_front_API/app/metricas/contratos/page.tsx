"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, ChevronDown, X, Building2, MapPin, Calendar, Clock } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

const STATUS_LABELS: Record<string, string> = {
  negociacao: "Negociação",
  ativo:      "Ativo",
  concluido:  "Concluído",
  cancelado:  "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  negociacao: "bg-amber-100 text-amber-800 border-amber-200",
  ativo:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  concluido:  "bg-blue-100 text-blue-800 border-blue-200",
  cancelado:  "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function fmtCNPJ(v: string) {
  const n = v.replace(/\D/g, "").slice(0, 14);
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
           .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1.$2.$3/$4")
           .replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3")
           .replace(/^(\d{2})(\d{3})$/, "$1.$2")
           .replace(/^(\d{2})$/, "$1");
}

interface Construtora { id: string; nome: string; cnpj: string | null; }
interface Contrato {
  id: string; nome: string; local: string | null;
  empreiteira: string | null; empreiteira_id: string | null;
  empreiteiras: Construtora | null;
  status: string; data_inicio: string | null; previsao_conclusao: string | null;
  created_at: string;
  orcamento_total: number;
}

interface ContratoForm {
  nome: string; local: string;
  construtora_id: string; nova_construtora: string; nova_construtora_cnpj: string;
  data_inicio: string; previsao_conclusao: string;
}

function emptyForm(): ContratoForm {
  return { nome: "", local: "", construtora_id: "", nova_construtora: "", nova_construtora_cnpj: "", data_inicio: "", previsao_conclusao: "" };
}

// ── Construtora Select ────────────────────────────────────────────────────────

function ConstrutaraSelect({
  construtoras, value, novaValue, novaCNPJ,
  onChange, onNovaChange, onNovaCNPJChange,
}: {
  construtoras: Construtora[]; value: string;
  novaValue: string; novaCNPJ: string;
  onChange: (id: string) => void;
  onNovaChange: (nome: string) => void;
  onNovaCNPJChange: (cnpj: string) => void;
}) {
  const [busca, setBusca]     = useState("");
  const [aberto, setAberto]   = useState(false);
  const [criando, setCriando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selecionada = construtoras.find(c => c.id === value);
  const filtradas   = construtoras.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()));

  if (criando) {
    return (
      <div className="space-y-2">
        <input autoFocus value={novaValue} onChange={e => onNovaChange(e.target.value)}
          className={INPUT} placeholder="Nome da construtora" />
        <input value={novaCNPJ} onChange={e => onNovaCNPJChange(fmtCNPJ(e.target.value))}
          className={INPUT} placeholder="CNPJ (opcional)" maxLength={18} />
        <button type="button" onClick={() => { setCriando(false); onNovaChange(""); onNovaCNPJChange(""); }}
          className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto(o => !o)}
        className={`${INPUT} text-left flex items-center justify-between`}>
        <span className={selecionada ? "text-zinc-900" : "text-zinc-400"}>
          {selecionada ? selecionada.nome : "Selecionar construtora..."}
        </span>
        <ChevronDown size={14} style={{ color: "rgba(26,42,58,0.35)", transition: "transform 0.2s", transform: aberto ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
      </button>
      {aberto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input autoFocus value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Buscar..." />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {value && (
              <button type="button" onClick={() => { onChange(""); setAberto(false); }}
                className="w-full text-left px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-50">
                — Nenhuma
              </button>
            )}
            {filtradas.length === 0
              ? <p className="px-4 py-3 text-sm text-zinc-400">Nenhuma encontrada</p>
              : filtradas.map(c => (
                <button key={c.id} type="button" onClick={() => { onChange(c.id); setAberto(false); setBusca(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 hover:text-orange-700 ${c.id === value ? "bg-orange-50 text-orange-700 font-medium" : "text-zinc-700"}`}>
                  <div>{c.nome}</div>
                  {c.cnpj && <div className="text-xs text-zinc-400 font-mono">{c.cnpj}</div>}
                </button>
              ))}
          </div>
          <div className="border-t border-zinc-100">
            <button type="button" onClick={() => { setCriando(true); onChange(""); setAberto(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 font-medium transition-colors">
              + Cadastrar nova construtora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ContratosPage() {
  const [contratos, setContratos]   = useState<Contrato[]>([]);
  const [construtoras, setConsts]   = useState<Construtora[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSub]        = useState(false);
  const [form, setForm]             = useState<ContratoForm>(emptyForm());
  const [erro, setErro]             = useState<string | null>(null);
  const [busca, setBusca]           = useState("");
  const [filtroStatus, setFiltro]   = useState("todos");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, re] = await Promise.all([
        fetch(`${API}/obras`).then(r => r.json()),
        fetch(`${API}/empreiteiras`).then(r => r.json()),
      ]);
      setContratos(rc.data ?? []);
      setConsts(re.data ?? []);
    } catch { setContratos([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const contFiltrados = contratos.filter(c => {
    const q = busca.toLowerCase();
    const match = c.nome.toLowerCase().includes(q)
      || (c.local ?? "").toLowerCase().includes(q)
      || (c.empreiteiras?.nome ?? c.empreiteira ?? "").toLowerCase().includes(q);
    const statusOk = filtroStatus === "todos" || c.status === filtroStatus;
    return match && statusOk;
  });

  const set = (f: keyof ContratoForm, v: string) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null); setSub(true);
    try {
      let empreiteiraId = form.construtora_id || null;

      if (form.nova_construtora.trim()) {
        const re = await fetch(`${API}/empreiteiras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nova_construtora.trim(), cnpj: form.nova_construtora_cnpj || null }),
        });
        const je = await re.json();
        if (!re.ok) { setErro(je.error ?? "Erro ao criar construtora"); setSub(false); return; }
        empreiteiraId = je.data.id;
        setConsts(prev => {
          const existe = prev.find(x => x.id === je.data.id);
          return existe ? prev : [...prev, je.data].sort((a, b) => a.nome.localeCompare(b.nome));
        });
      }

      const payload = {
        nome:               form.nome,
        local:              form.local || null,
        empreiteira_id:     empreiteiraId,
        status:             "negociacao",
        data_inicio:        form.data_inicio || null,
        previsao_conclusao: form.previsao_conclusao || null,
      };

      const r = await fetch(`${API}/obras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json(); toastError(j.error ?? "Erro ao registrar contrato"); setErro(j.error ?? "Erro"); return; }
      toastSuccess("Contrato registrado! Orçamentistas serão notificados.");
      setForm(emptyForm()); setShowForm(false); await fetchData();
    } catch { toastError("Erro de conexão"); setErro("Erro de conexão"); } finally { setSub(false); }
  };

  const negCount = contratos.filter(c => c.status === "negociacao").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "6px" }}>
            Contratos
          </h1>
          <p className="text-sm text-zinc-500">
            {loading ? "Carregando..." : `${contratos.length} obra${contratos.length !== 1 ? "s" : ""}`}
            {negCount > 0 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">{negCount} em negociação</span>}
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setErro(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: showForm ? "rgba(26,42,58,0.7)" : "#1A2A3A", color: "#F3ECE0", border: "none", cursor: "pointer" }}>
          {showForm ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Registrar Contrato</>}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 overflow-hidden">
          <div className="px-5 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Nova Obra em Negociação</h2>
            {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Nome */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome da obra *</label>
                <input required value={form.nome} onChange={e => set("nome", e.target.value)}
                  className={INPUT} placeholder="Ex: Edifício Residencial Beira-Mar" />
              </div>
              {/* Local */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  <span className="inline-flex items-center gap-1"><MapPin size={11} />Endereço / Local</span>
                </label>
                <input value={form.local} onChange={e => set("local", e.target.value)}
                  className={INPUT} placeholder="Ex: Rua das Flores, 123 — Rio de Janeiro" />
              </div>
              {/* Construtora */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  <span className="inline-flex items-center gap-1"><Building2 size={11} />Construtora</span>
                </label>
                <ConstrutaraSelect
                  construtoras={construtoras}
                  value={form.construtora_id}
                  novaValue={form.nova_construtora}
                  novaCNPJ={form.nova_construtora_cnpj}
                  onChange={id => setForm(p => ({ ...p, construtora_id: id }))}
                  onNovaChange={v => setForm(p => ({ ...p, nova_construtora: v }))}
                  onNovaCNPJChange={v => setForm(p => ({ ...p, nova_construtora_cnpj: v }))}
                />
              </div>
              {/* Datas */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  <span className="inline-flex items-center gap-1"><Calendar size={11} />Data de início <span className="text-zinc-300 font-normal">(opcional)</span></span>
                </label>
                <input type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)}
                  className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  <span className="inline-flex items-center gap-1"><Clock size={11} />Previsão de conclusão <span className="text-zinc-300 font-normal">(opcional)</span></span>
                </label>
                <input type="date" value={form.previsao_conclusao} onChange={e => set("previsao_conclusao", e.target.value)}
                  className={INPUT} />
              </div>
              {/* Status fixo */}
              <div className="flex items-end">
                <div className="w-full">
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Status inicial</label>
                  <div className="flex items-center h-[42px] px-3 border border-amber-200 bg-amber-50/50 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">Em negociação</span>
                    <span className="ml-2 text-xs text-amber-600">(definido automaticamente)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 bg-zinc-50 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400">Ao registrar, os orçamentistas serão notificados por e-mail e pelo sistema.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setErro(null); setForm(emptyForm()); }}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
              <button type="submit" disabled={submitting}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                {submitting ? "Registrando..." : "Registrar Contrato"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtros */}
      {!loading && contratos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input type="search" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, local ou construtora..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <select value={filtroStatus} onChange={e => setFiltro(e.target.value)}
            className="border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="todos">Todos os status</option>
            <option value="negociacao">Em negociação</option>
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">Carregando...</div>
        ) : contFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <p className="text-sm font-medium text-zinc-500">{busca || filtroStatus !== "todos" ? "Nenhum contrato encontrado" : "Nenhum contrato registrado"}</p>
            <p className="text-xs text-zinc-400">{busca || filtroStatus !== "todos" ? "Tente outros filtros" : "Clique em \"+ Registrar Contrato\" para começar"}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {contFiltrados.map(c => {
              const constNome = c.empreiteiras?.nome ?? c.empreiteira ?? null;
              const constCNPJ = c.empreiteiras?.cnpj ?? null;
              return (
                <div key={c.id} className="px-5 sm:px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-zinc-900 text-base leading-snug">{c.nome}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[c.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        {c.local && (
                          <span className="flex items-center gap-1"><MapPin size={11} />{c.local}</span>
                        )}
                        {constNome && (
                          <span className="flex items-center gap-1">
                            <Building2 size={11} />
                            {constNome}
                            {constCNPJ && <span className="font-mono text-zinc-400 ml-1">{constCNPJ}</span>}
                          </span>
                        )}
                        {c.data_inicio && (
                          <span className="flex items-center gap-1"><Calendar size={11} />Início: {fmtDate(c.data_inicio)}</span>
                        )}
                        {c.previsao_conclusao && (
                          <span className="flex items-center gap-1"><Clock size={11} />Conclusão: {fmtDate(c.previsao_conclusao)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-zinc-400 mb-0.5">Registrado em</div>
                      <div className="text-sm text-zinc-600">{fmtDate(c.created_at.split("T")[0])}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
