"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

const ETAPAS = [
  { value: "massa_parede", label: "Massa Parede" },
  { value: "massa_teto",   label: "Massa Teto"   },
  { value: "lixacao",      label: "Lixacao"       },
  { value: "pintura",      label: "Pintura"       },
  { value: "acabamento",   label: "Acabamento"    },
];

const TIPOS_COMODO = [
  { value: "sala",           label: "Sala"            },
  { value: "quarto",         label: "Quarto"          },
  { value: "banheiro",       label: "Banheiro"        },
  { value: "suite",          label: "Suite"           },
  { value: "varanda",        label: "Varanda"         },
  { value: "lavatorio",      label: "Lavatorio"       },
  { value: "circulacao",     label: "Circulacao"      },
  { value: "corredor",       label: "Corredor"        },
  { value: "escritorio",     label: "Escritorio"      },
  { value: "area_tecnica",   label: "Area Tecnica"    },
  { value: "escada",         label: "Escada"          },
  { value: "casa_maquinas",  label: "Casa de Maquinas"},
  { value: "casa_exaustao",  label: "Casa de Exaustao"},
  { value: "estacionamento", label: "Estacionamento"  },
  { value: "garagem",        label: "Garagem"         },
  { value: "deposito",       label: "Deposito"        },
  { value: "area_lazer",     label: "Area de Lazer"   },
];

type EtapaKey = "massa_parede" | "massa_teto" | "lixacao" | "pintura" | "acabamento";

interface Empreiteira     { id: string; nome: string; }
interface ComodoForm      { tipo: string; nome: string; parede1_m2: string; parede2_m2: string; parede3_m2: string; parede4_m2: string; teto_m2: string; }
interface ApartamentoForm { nome: string; numero: string; tipo_nome: string; comodos: ComodoForm[]; }
interface PavimentoForm   { nome: string; numero: string; tipo: string; apartamentos: ApartamentoForm[]; comodos: ComodoForm[]; }
interface PrecoForm        { etapa: string; preco_m2: string; }
interface ObraForm         { nome: string; local: string; empreiteira_id: string; nova_empreiteira: string; precos: PrecoForm[]; pavimentos: PavimentoForm[]; apartamento_tipos: string[]; }

interface ObraLista {
  id: string; nome: string; local: string | null; empreiteira: string | null;
  empreiteira_id: string | null;
  empreiteiras: Empreiteira | null;
  created_at: string; orcamento_total: number;
  pavimentos: { id: string; nome: string; comodos: { id: string }[] }[];
}

const emptyComodo      = (): ComodoForm      => ({ tipo: "sala", nome: "", parede1_m2: "", parede2_m2: "", parede3_m2: "", parede4_m2: "", teto_m2: "" });
const emptyApartamento = (): ApartamentoForm => ({ nome: "", numero: "", tipo_nome: "", comodos: [emptyComodo()] });
const emptyPavimento   = (): PavimentoForm   => ({ nome: "", numero: "", tipo: "pavimento", apartamentos: [], comodos: [] });
const emptyForm        = (): ObraForm        => ({ nome: "", local: "", empreiteira_id: "", nova_empreiteira: "", precos: ETAPAS.map(e => ({ etapa: e.value, preco_m2: "" })), pavimentos: [emptyPavimento()], apartamento_tipos: [] });

const n   = (v: string) => parseFloat(v) || 0;
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const INPUT    = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

function calcOrcComodo(c: ComodoForm, precoMap: Record<string, number>) {
  const totalParedes = n(c.parede1_m2) + n(c.parede2_m2) + n(c.parede3_m2) + n(c.parede4_m2);
  const teto         = n(c.teto_m2);
  const totalArea    = totalParedes + teto;
  const orc = {
    massa_parede: totalParedes * (precoMap.massa_parede ?? 0),
    massa_teto:   teto         * (precoMap.massa_teto   ?? 0),
    lixacao:      totalArea    * (precoMap.lixacao       ?? 0),
    pintura:      totalArea    * (precoMap.pintura       ?? 0),
    acabamento:   totalArea    * (precoMap.acabamento    ?? 0),
  };
  return { ...orc, total: Object.values(orc).reduce((a, b) => a + b, 0), totalParedes };
}

// ── Componente EmpreiteiraSelect ──────────────────────────────────────────────

function EmpreiteiraSelect({
  empreiteiras,
  value,
  novaValue,
  onChange,
  onNovaChange,
}: {
  empreiteiras: Empreiteira[];
  value: string;
  novaValue: string;
  onChange: (id: string) => void;
  onNovaChange: (nome: string) => void;
}) {
  const [busca, setBusca]       = useState("");
  const [aberto, setAberto]     = useState(false);
  const [criando, setCriando]   = useState(false);
  const ref                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selecionada = empreiteiras.find(e => e.id === value);
  const filtradas   = empreiteiras.filter(e => e.nome.toLowerCase().includes(busca.toLowerCase()));

  function selecionar(e: Empreiteira) {
    onChange(e.id);
    onNovaChange("");
    setCriando(false);
    setAberto(false);
    setBusca("");
  }

  function iniciarCriacao() {
    onChange("");
    setCriando(true);
    setAberto(false);
    setBusca("");
  }

  function cancelarCriacao() {
    setCriando(false);
    onNovaChange("");
  }

  if (criando) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={novaValue}
          onChange={e => onNovaChange(e.target.value)}
          className={INPUT}
          placeholder="Nome da nova empreiteira"
        />
        <button
          type="button"
          onClick={cancelarCriacao}
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto(o => !o)}
        className={`${INPUT} text-left flex items-center justify-between`}
      >
        <span className={selecionada ? "text-zinc-900" : "text-zinc-400"}>
          {selecionada ? selecionada.nome : "Selecionar empreiteira..."}
        </span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${aberto ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Buscar..."
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setAberto(false); }}
                className="w-full text-left px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-50 transition-colors"
              >
                — Nenhuma
              </button>
            )}
            {filtradas.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-400">Nenhuma encontrada</p>
            ) : (
              filtradas.map(e => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => selecionar(e)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 hover:text-orange-700 ${e.id === value ? "bg-orange-50 text-orange-700 font-medium" : "text-zinc-700"}`}
                >
                  {e.nome}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-zinc-100">
            <button
              type="button"
              onClick={iniciarCriacao}
              className="w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              + Cadastrar nova empreiteira
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function ObrasPage() {
  const [obras, setObras]             = useState<ObraLista[]>([]);
  const [empreiteiras, setEmpreiteiras] = useState<Empreiteira[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSub]          = useState(false);
  const [form, setForm]               = useState<ObraForm>(emptyForm());
  const [erro, setErro]               = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [busca, setBusca]             = useState("");

  const precoMap = Object.fromEntries(form.precos.map(p => [p.etapa, n(p.preco_m2)]));

  const fetchObras = useCallback(async () => {
    setLoading(true);
    try {
      const [ro, re] = await Promise.all([
        fetch(`${API}/obras`).then(r => r.json()),
        fetch(`${API}/empreiteiras`).then(r => r.json()),
      ]);
      setObras(ro.data ?? []);
      setEmpreiteiras(re.data ?? []);
    } catch { setObras([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchObras(); }, [fetchObras]);

  const obrasFiltradas = busca.trim()
    ? obras.filter(o => {
        const q = busca.toLowerCase();
        const emp = o.empreiteiras?.nome ?? o.empreiteira ?? "";
        return o.nome.toLowerCase().includes(q) || (o.local ?? "").toLowerCase().includes(q) || emp.toLowerCase().includes(q);
      })
    : obras;

  const setObra        = (f: "nome" | "local", v: string) => setForm(p => ({ ...p, [f]: v }));
  const setPreco       = (i: number, v: string)           => setForm(p => { const a = [...p.precos]; a[i] = { ...a[i], preco_m2: v }; return { ...p, precos: a }; });
  const addPav         = ()                               => setForm(p => ({ ...p, pavimentos: [...p.pavimentos, emptyPavimento()] }));
  const removePav      = (pi: number)                     => setForm(p => ({ ...p, pavimentos: p.pavimentos.filter((_, i) => i !== pi) }));
  const setPavField    = (pi: number, f: "nome" | "numero" | "tipo", v: string) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], [f]: v }; return { ...p, pavimentos: a }; });

  // cômodos avulsos do pavimento
  const addComodoAvulso    = (pi: number)                     => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: [...a[pi].comodos, emptyComodo()] }; return { ...p, pavimentos: a }; });
  const removeComodoAvulso = (pi: number, ci: number)         => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: a[pi].comodos.filter((_, i) => i !== ci) }; return { ...p, pavimentos: a }; });
  const setComodoAvulso    = (pi: number, ci: number, f: keyof ComodoForm, v: string) => setForm(p => {
    const a = [...p.pavimentos]; const cs = [...a[pi].comodos]; cs[ci] = { ...cs[ci], [f]: v }; a[pi] = { ...a[pi], comodos: cs }; return { ...p, pavimentos: a };
  });

  // apartamentos do pavimento
  const addApt    = (pi: number)                     => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], apartamentos: [...a[pi].apartamentos, emptyApartamento()] }; return { ...p, pavimentos: a }; });
  const removeApt = (pi: number, ai: number)         => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], apartamentos: a[pi].apartamentos.filter((_, i) => i !== ai) }; return { ...p, pavimentos: a }; });
  const setAptField = (pi: number, ai: number, f: keyof Pick<ApartamentoForm, "nome" | "numero" | "tipo_nome">, v: string) => setForm(p => {
    const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; apts[ai] = { ...apts[ai], [f]: v }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a };
  });

  // cômodos dentro de um apartamento
  const addComodoApt    = (pi: number, ai: number)                     => setForm(p => { const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; apts[ai] = { ...apts[ai], comodos: [...apts[ai].comodos, emptyComodo()] }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a }; });
  const removeComodoApt = (pi: number, ai: number, ci: number)         => setForm(p => { const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; apts[ai] = { ...apts[ai], comodos: apts[ai].comodos.filter((_, i) => i !== ci) }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a }; });
  const setComodoApt    = (pi: number, ai: number, ci: number, f: keyof ComodoForm, v: string) => setForm(p => {
    const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; const cs = [...apts[ai].comodos]; cs[ci] = { ...cs[ci], [f]: v }; apts[ai] = { ...apts[ai], comodos: cs }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a };
  });

  const calcComodoTotal = (c: ComodoForm) => calcOrcComodo(c, precoMap).total;

  // Quando o tipo muda, copia cômodos do primeiro apartamento com esse tipo (se existir)
  const handleAptTipoChange = (pi: number, ai: number, tipo_nome: string) => {
    setForm(p => {
      const pavimentos = [...p.pavimentos];
      const apts = [...pavimentos[pi].apartamentos];
      const apt = { ...apts[ai], tipo_nome };

      if (tipo_nome) {
        // Procura template: primeiro apto com esse tipo (excluindo o atual)
        let template: ComodoForm[] | null = null;
        outer: for (let pj = 0; pj < pavimentos.length; pj++) {
          for (let aj = 0; aj < pavimentos[pj].apartamentos.length; aj++) {
            if (pj === pi && aj === ai) continue;
            if (pavimentos[pj].apartamentos[aj].tipo_nome === tipo_nome) {
              template = pavimentos[pj].apartamentos[aj].comodos.map(c => ({ ...c }));
              break outer;
            }
          }
        }
        // Só auto-preenche se o apto atual ainda está no estado padrão (1 cômodo vazio)
        const isDefault = apts[ai].comodos.length === 1 &&
          apts[ai].comodos[0].tipo === "sala" &&
          apts[ai].comodos[0].nome === "" &&
          !n(apts[ai].comodos[0].parede1_m2);
        if (template && (isDefault || apts[ai].comodos.length === 0)) {
          apt.comodos = template;
        }
      }

      apts[ai] = apt;
      pavimentos[pi] = { ...pavimentos[pi], apartamentos: apts };
      return { ...p, pavimentos };
    });
  };

  const obraTotal = form.pavimentos.reduce((s, pav) => {
    const avulsos = pav.comodos.reduce((ps, c) => ps + calcComodoTotal(c), 0);
    const apts    = pav.apartamentos.reduce((as, apt) => as + apt.comodos.reduce((cs, c) => cs + calcComodoTotal(c), 0), 0);
    return s + avulsos + apts;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null); setSub(true);
    try {
      let empreiteiraId = form.empreiteira_id || null;

      if (form.nova_empreiteira.trim()) {
        const re = await fetch(`${API}/empreiteiras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nova_empreiteira.trim() }),
        });
        const je = await re.json();
        if (!re.ok) { setErro(je.error ?? "Erro ao criar empreiteira"); setSub(false); return; }
        empreiteiraId = je.data.id;
        setEmpreiteiras(prev => {
          const existe = prev.find(x => x.id === je.data.id);
          return existe ? prev : [...prev, je.data].sort((a, b) => a.nome.localeCompare(b.nome));
        });
      }

      const mapComodo = (c: ComodoForm) => ({
        tipo: c.tipo, nome: c.nome || null,
        parede1_m2: n(c.parede1_m2), parede2_m2: n(c.parede2_m2),
        parede3_m2: n(c.parede3_m2), parede4_m2: n(c.parede4_m2),
        teto_m2: n(c.teto_m2),
      });

      const payload = {
        nome: form.nome,
        local: form.local || null,
        empreiteira_id: empreiteiraId,
        precos: form.precos.filter(p => p.preco_m2 !== "").map(p => ({ etapa: p.etapa, preco_m2: n(p.preco_m2) })),
        apartamento_tipos: form.apartamento_tipos.filter(t => t.trim() !== ""),
        pavimentos: form.pavimentos.map(pav => ({
          nome: pav.nome,
          numero: parseInt(pav.numero) || 0,
          tipo: pav.tipo || "pavimento",
          apartamentos: pav.apartamentos.map(apt => ({
            nome: apt.nome || null,
            numero: apt.numero ? parseInt(apt.numero) : null,
            tipo_nome: apt.tipo_nome || null,
            comodos: apt.comodos.map(mapComodo),
          })),
          comodos: pav.comodos.map(mapComodo),
        })),
      };
      const r = await fetch(`${API}/obras`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const j = await r.json(); setErro(j.error ?? "Erro ao salvar"); return; }
      setForm(emptyForm()); setShowForm(false); await fetchObras();
    } catch { setErro("Erro de conexao com a API"); } finally { setSub(false); }
  };

  const handleDelete = async (obraId: string) => {
    setDeleting(true);
    try {
      const r = await fetch(`${API}/obras/${obraId}`, { method: "DELETE" });
      if (r.ok) {
        setConfirmDelete(null);
        setObras(prev => prev.filter(o => o.id !== obraId));
      }
    } finally { setDeleting(false); }
  };

  const nomeEmpreiteira = (o: ObraLista) => o.empreiteiras?.nome ?? o.empreiteira ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400 mb-6 sm:mb-8">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-zinc-600 font-medium">Obras</span>
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Obras</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {loading ? "Carregando..." : `${obras.length} obra${obras.length !== 1 ? "s" : ""} · ${empreiteiras.length} empreiteira${empreiteiras.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setErro(null); }}
          className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nova Obra"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 overflow-hidden">

          {/* Dados */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Dados da Obra</h2>
            {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome *</label>
                <input required value={form.nome} onChange={e => setObra("nome", e.target.value)}
                  className={INPUT} placeholder="Ex: Edificio Central" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Local</label>
                <input value={form.local} onChange={e => setObra("local", e.target.value)}
                  className={INPUT} placeholder="Ex: Rua das Flores, 123" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Empreiteira</label>
                <EmpreiteiraSelect
                  empreiteiras={empreiteiras}
                  value={form.empreiteira_id}
                  novaValue={form.nova_empreiteira}
                  onChange={id => setForm(p => ({ ...p, empreiteira_id: id }))}
                  onNovaChange={v => setForm(p => ({ ...p, nova_empreiteira: v }))}
                />
              </div>
            </div>
          </div>

          {/* Precos */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Preco por m² / Etapa</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {form.precos.map((p, i) => (
                <div key={p.etapa}>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">{ETAPAS[i].label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium pointer-events-none">R$</span>
                    <input type="number" step="0.01" min="0" value={p.preco_m2} onChange={e => setPreco(i, e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                      placeholder="0,00" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipos de Apartamento */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Tipos de Apartamento</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Opcional · define os layouts (ex: Tipo A, Studio, Garden)</p>
              </div>
              <button type="button"
                onClick={() => setForm(p => ({ ...p, apartamento_tipos: [...p.apartamento_tipos, ""] }))}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                + Tipo
              </button>
            </div>
            {form.apartamento_tipos.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">Nenhum tipo definido. Clique em "+ Tipo" para adicionar (ex: Tipo A, Studio).</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.apartamento_tipos.map((tipo, ti) => (
                  <div key={ti} className="flex items-center gap-1">
                    <input
                      value={tipo}
                      onChange={e => setForm(p => { const a = [...p.apartamento_tipos]; a[ti] = e.target.value; return { ...p, apartamento_tipos: a }; })}
                      className={`w-32 ${INPUT_SM}`}
                      placeholder="Ex: Tipo A"
                    />
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, apartamento_tipos: p.apartamento_tipos.filter((_, i) => i !== ti) }))}
                      className="text-zinc-300 hover:text-red-400 transition-colors text-lg leading-none px-1">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pavimentos */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Pavimentos</h2>
              <button type="button" onClick={addPav}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                + Pavimento
              </button>
            </div>

            <div className="space-y-5">
              {form.pavimentos.map((pav, pi) => {
                const aptTotal  = pav.apartamentos.reduce((s, apt) => s + apt.comodos.reduce((cs, c) => cs + calcOrcComodo(c, precoMap).total, 0), 0);
                const avulTotal = pav.comodos.reduce((s, c) => s + calcOrcComodo(c, precoMap).total, 0);
                const pavTotal  = aptTotal + avulTotal;
                return (
                  <div key={pi} className="border border-zinc-200 rounded-xl overflow-hidden">
                    {/* Cabeçalho do pavimento */}
                    <div className="bg-zinc-50 px-4 py-3 flex items-center gap-3 border-b border-zinc-200 flex-wrap">
                      <span className="text-xs font-bold text-zinc-400 w-4 shrink-0">{pi + 1}</span>
                      <select value={pav.tipo} onChange={e => setPavField(pi, "tipo", e.target.value)}
                        className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="pavimento">Pavimento</option>
                        <option value="subsolo">Subsolo</option>
                      </select>
                      <input required value={pav.nome} onChange={e => setPavField(pi, "nome", e.target.value)}
                        className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder={pav.tipo === "subsolo" ? "Ex: Subsolo 1" : "Ex: Terreo, 1 Andar"} />
                      <input required type="number" value={pav.numero} onChange={e => setPavField(pi, "numero", e.target.value)}
                        className={`w-20 ${INPUT_SM}`} placeholder="N°" />
                      {pavTotal > 0 && <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{fmt(pavTotal)}</span>}
                      {form.pavimentos.length > 1 && (
                        <button type="button" onClick={() => removePav(pi)}
                          className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-1">Remover</button>
                      )}
                    </div>

                    <div className="divide-y divide-zinc-100">

                      {/* ── Apartamentos ─────────────────────────────────────── */}
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Apartamentos</span>
                          <button type="button" onClick={() => addApt(pi)}
                            className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-colors">
                            + Apartamento
                          </button>
                        </div>

                        {pav.apartamentos.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">Nenhum apartamento. Clique em "+ Apartamento" para adicionar.</p>
                        ) : (
                          <div className="space-y-3">
                            {pav.apartamentos.map((apt, ai) => {
                              const aptComodoTotal = apt.comodos.reduce((s, c) => s + calcOrcComodo(c, precoMap).total, 0);
                              return (
                                <div key={ai} className="border border-blue-100 rounded-lg overflow-hidden">
                                  {/* Cabeçalho do apartamento */}
                                  <div className="bg-blue-50/60 px-3 py-2 flex items-center gap-2 flex-wrap border-b border-blue-100">
                                    <input value={apt.nome} onChange={e => setAptField(pi, ai, "nome", e.target.value)}
                                      className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome (ex: Apto 101)" />
                                    <input type="number" min="0" value={apt.numero} onChange={e => setAptField(pi, ai, "numero", e.target.value)}
                                      className={`w-16 ${INPUT_SM}`} placeholder="N°" />
                                    <select value={apt.tipo_nome} onChange={e => handleAptTipoChange(pi, ai, e.target.value)}
                                      className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                      <option value="">— Sem tipo —</option>
                                      {form.apartamento_tipos.filter(t => t.trim()).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                    {aptComodoTotal > 0 && <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{fmt(aptComodoTotal)}</span>}
                                    <button type="button" onClick={() => removeApt(pi, ai)}
                                      className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-1 ml-auto">Remover</button>
                                  </div>

                                  {/* Cômodos do apartamento */}
                                  <div className="p-3 space-y-2">
                                    {apt.comodos.map((c, ci) => {
                                      const orc = calcOrcComodo(c, precoMap);
                                      return (
                                        <div key={ci} className="border border-zinc-100 rounded-lg p-2.5 space-y-2 bg-white">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <select value={c.tipo} onChange={e => setComodoApt(pi, ai, ci, "tipo", e.target.value)}
                                              className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                              {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                            <input value={c.nome} onChange={e => setComodoApt(pi, ai, ci, "nome", e.target.value)}
                                              className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome opcional" />
                                            {orc.total > 0 && <span className="text-xs font-bold text-orange-600">{fmt(orc.total)}</span>}
                                            <button type="button" onClick={() => addComodoApt(pi, ai)}
                                              className="text-xs text-orange-600 border border-orange-200 rounded-lg px-2 py-1.5 hover:border-orange-400 transition-colors whitespace-nowrap">+ Cômodo</button>
                                            {apt.comodos.length > 1 && (
                                              <button type="button" onClick={() => removeComodoApt(pi, ai, ci)}
                                                className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 rounded-lg px-2 py-1.5 transition-colors">Remover</button>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                            {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f, fi) => (
                                              <div key={f}>
                                                <label className="block text-xs text-zinc-400 mb-0.5">Parede {fi + 1} m²</label>
                                                <input type="number" step="0.01" min="0" value={c[f]}
                                                  onChange={e => setComodoApt(pi, ai, ci, f, e.target.value)}
                                                  className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                                              </div>
                                            ))}
                                            <div>
                                              <label className="block text-xs text-zinc-400 mb-0.5">Teto m²</label>
                                              <input type="number" step="0.01" min="0" value={c.teto_m2}
                                                onChange={e => setComodoApt(pi, ai, ci, "teto_m2", e.target.value)}
                                                className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* ── Cômodos Avulsos ───────────────────────────────────── */}
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cômodos Avulsos</span>
                          <button type="button" onClick={() => addComodoAvulso(pi)}
                            className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-2.5 py-1 rounded-lg transition-colors">
                            + Cômodo
                          </button>
                        </div>

                        {pav.comodos.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">Nenhum cômodo avulso (escada, hall, etc.).</p>
                        ) : (
                          <div className="space-y-2">
                            {pav.comodos.map((c, ci) => {
                              const orc = calcOrcComodo(c, precoMap);
                              return (
                                <div key={ci} className="border border-zinc-100 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <select value={c.tipo} onChange={e => setComodoAvulso(pi, ci, "tipo", e.target.value)}
                                      className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                      {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <input value={c.nome} onChange={e => setComodoAvulso(pi, ci, "nome", e.target.value)}
                                      className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome opcional" />
                                    {orc.total > 0 && <span className="text-xs font-bold text-orange-600">{fmt(orc.total)}</span>}
                                    {pav.comodos.length > 1 && (
                                      <button type="button" onClick={() => removeComodoAvulso(pi, ci)}
                                        className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 rounded-lg px-2 py-1.5 transition-colors">Remover</button>
                                    )}
                                    {pav.comodos.length === 1 && (
                                      <button type="button" onClick={() => removeComodoAvulso(pi, ci)}
                                        className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 rounded-lg px-2 py-1.5 transition-colors">Remover</button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                    {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f, fi) => (
                                      <div key={f}>
                                        <label className="block text-xs text-zinc-400 mb-0.5">Parede {fi + 1} m²</label>
                                        <input type="number" step="0.01" min="0" value={c[f]}
                                          onChange={e => setComodoAvulso(pi, ci, f, e.target.value)}
                                          className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                                      </div>
                                    ))}
                                    <div>
                                      <label className="block text-xs text-zinc-400 mb-0.5">Teto m²</label>
                                      <input type="number" step="0.01" min="0" value={c.teto_m2}
                                        onChange={e => setComodoAvulso(pi, ci, "teto_m2", e.target.value)}
                                        className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 bg-zinc-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {obraTotal > 0 ? (
              <span className="text-sm text-zinc-600">
                Total estimado: <span className="font-bold text-zinc-900">{fmt(obraTotal)}</span>
              </span>
            ) : <span />}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setErro(null); setForm(emptyForm()); }}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                {submitting ? "Salvando..." : "Registrar Obra"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Busca */}
      {!loading && obras.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, local ou empreiteira..."
            className="w-full sm:w-80 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
          />
        </div>
      )}

      {/* Lista */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">Carregando...</div>
        ) : obrasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-1.5">
            <p className="text-sm font-medium text-zinc-500">{busca ? "Nenhuma obra encontrada" : "Nenhuma obra cadastrada"}</p>
            <p className="text-xs text-zinc-400">{busca ? "Tente outro termo de busca" : "Clique em \"+ Nova Obra\" para comecar"}</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-zinc-100">
              {obrasFiltradas.map(o => (
                <div key={o.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-zinc-900 text-sm leading-snug">{o.nome}</p>
                    {(o.orcamento_total ?? 0) > 0 && (
                      <span className="text-sm font-bold text-orange-600 tabular-nums shrink-0">{fmt(o.orcamento_total)}</span>
                    )}
                  </div>
                  {o.local && <p className="text-xs text-zinc-500 mb-0.5">{o.local}</p>}
                  {nomeEmpreiteira(o) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 mb-2">
                      {nomeEmpreiteira(o)}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                    {o.pavimentos.length > 0 && <><span>{o.pavimentos.length} pav.</span><span>·</span><span>{o.pavimentos.reduce((s, p) => s + p.comodos.length, 0)} comodos</span></>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/orcamentos/obras/${o.id}`}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                      Ver detalhes →
                    </Link>
                    {confirmDelete === o.id ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-zinc-500">Excluir?</span>
                        <button onClick={() => handleDelete(o.id)} disabled={deleting}
                          className="text-red-600 font-medium hover:text-red-700 disabled:opacity-50">Sim</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(o.id)}
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3">Obra</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Local</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Empreiteira</th>
                    <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Pav.</th>
                    <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Comodos</th>
                    <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Orcamento</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {obrasFiltradas.map((o, idx) => (
                    <tr key={o.id} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors ${idx % 2 === 0 ? "" : "bg-zinc-50/30"}`}>
                      <td className="px-6 py-4 font-semibold text-zinc-900">{o.nome}</td>
                      <td className="px-4 py-4 text-zinc-500 text-xs">{o.local ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-4">
                        {nomeEmpreiteira(o)
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">{nomeEmpreiteira(o)}</span>
                          : <span className="text-zinc-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-4 text-center text-zinc-600 tabular-nums">{o.pavimentos.length || <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-4 text-center text-zinc-600 tabular-nums">{o.pavimentos.reduce((s, p) => s + p.comodos.length, 0) || <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-4 text-right font-semibold text-zinc-900 tabular-nums">
                        {(o.orcamento_total ?? 0) > 0 ? fmt(o.orcamento_total) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/orcamentos/obras/${o.id}`}
                            className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors whitespace-nowrap">
                            Ver →
                          </Link>
                          {confirmDelete === o.id ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="text-zinc-500">Excluir?</span>
                              <button onClick={() => handleDelete(o.id)} disabled={deleting}
                                className="text-red-600 font-medium hover:text-red-700 disabled:opacity-50">Sim</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDelete(o.id)}
                              className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
