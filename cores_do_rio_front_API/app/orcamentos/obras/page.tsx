"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, ChevronDown, Trash2 } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";
import { usePagination } from "@/lib/hooks/usePagination";
import Pagination from "@/components/Pagination";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

const ETAPAS = [
  { value: "massa_parede", label: "Massa Parede" },
  { value: "massa_teto",   label: "Massa Teto"   },
  { value: "lixacao",      label: "Lixação"       },
  { value: "pintura",      label: "Pintura"       },
  { value: "acabamento",   label: "Acabamento"    },
];

const TIPOS_COMODO = [
  { value: "sala",           label: "Sala"            },
  { value: "quarto",         label: "Quarto"          },
  { value: "banheiro",       label: "Banheiro"        },
  { value: "suite",          label: "Suíte"           },
  { value: "varanda",        label: "Varanda"         },
  { value: "lavatorio",      label: "Lavatório"       },
  { value: "circulacao",     label: "Circulação"      },
  { value: "corredor",       label: "Corredor"        },
  { value: "escritorio",     label: "Escritório"      },
  { value: "area_tecnica",   label: "Área Técnica"    },
  { value: "escada",         label: "Escada"          },
  { value: "casa_maquinas",  label: "Casa de Máquinas"},
  { value: "casa_exaustao",  label: "Casa de Exaustão"},
  { value: "estacionamento", label: "Estacionamento"  },
  { value: "garagem",        label: "Garagem"         },
  { value: "deposito",       label: "Depósito"        },
  { value: "area_lazer",     label: "Área de Lazer"   },
];

type EtapaKey = "massa_parede" | "massa_teto" | "lixacao" | "pintura" | "acabamento";

interface Empreiteira     { id: string; nome: string; }
interface ParedeInput     { m2: string; cor: string; }
interface TetoInput       { m2: string; }
interface PrecoTipoForm   { nome: string; precos: Record<string, string>; }
interface ComodoForm      { tipo: string; nome: string; paredes: ParedeInput[]; tetos: TetoInput[]; preco_tipo_nome: string; }
interface ApartamentoForm { nome: string; numero: string; tipo_nome: string; preco_tipo_nome: string; comodos: ComodoForm[]; }
interface PavimentoForm   { nome: string; numero: string; tipo: string; apartamentos: ApartamentoForm[]; comodos: ComodoForm[]; }
interface PrecoForm        { etapa: string; preco_m2: string; }
interface ObraForm         { nome: string; local: string; empreiteira_id: string; nova_empreiteira: string; precos: PrecoForm[]; preco_tipos: PrecoTipoForm[]; pavimentos: PavimentoForm[]; apartamento_tipos: string[]; }

interface ObraLista {
  id: string; nome: string; local: string | null; empreiteira: string | null;
  empreiteira_id: string | null;
  empreiteiras: Empreiteira | null;
  status: string | null;
  created_at: string; orcamento_total: number;
  pavimentos: { id: string; nome: string; comodos: { id: string }[] }[];
}

const emptyPrecoTipo   = (): PrecoTipoForm   => ({ nome: "", precos: Object.fromEntries(ETAPAS.map(e => [e.value, ""])) });
const emptyComodo      = (): ComodoForm      => ({ tipo: "sala", nome: "", paredes: [{ m2: "", cor: "" }], tetos: [{ m2: "" }], preco_tipo_nome: "" });
const emptyApartamento = (): ApartamentoForm => ({ nome: "", numero: "", tipo_nome: "", preco_tipo_nome: "", comodos: [emptyComodo()] });
const emptyPavimento   = (): PavimentoForm   => ({ nome: "", numero: "", tipo: "pavimento", apartamentos: [], comodos: [] });
const emptyForm        = (): ObraForm        => ({ nome: "", local: "", empreiteira_id: "", nova_empreiteira: "", precos: ETAPAS.map(e => ({ etapa: e.value, preco_m2: "" })), preco_tipos: [], pavimentos: [emptyPavimento()], apartamento_tipos: [] });

const n   = (v: string) => parseFloat(v) || 0;
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const INPUT    = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

function resolvePrecoMapForm(
  tipoNome: string,
  preco_tipos: PrecoTipoForm[],
  base: Record<string, number>
): Record<string, number> {
  if (!tipoNome) return base;
  const tipo = preco_tipos.find(t => t.nome.trim() === tipoNome);
  if (!tipo) return base;
  const override = Object.fromEntries(
    ETAPAS.filter(e => tipo.precos[e.value] !== "" && tipo.precos[e.value] != null)
      .map(e => [e.value, n(tipo.precos[e.value])])
  );
  return { ...base, ...override };
}

function calcOrcComodo(c: ComodoForm, precoMap: Record<string, number>) {
  const totalParedes = c.paredes.reduce((s, p) => s + n(p.m2), 0);
  const teto         = c.tetos.reduce((s, t) => s + n(t.m2), 0);
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
        <ChevronDown size={14} style={{ color: "rgba(26,42,58,0.35)", transition: "transform 0.2s", transform: aberto ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
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
  const [obraParaOrcar, setObraParaOrcar] = useState<ObraLista | null>(null);
  const [loadingEdit, setLoadingEdit]   = useState(false);
  const [pavCollapsed, setPavCollapsed] = useState<Record<number, boolean>>({});
  const [aptCollapsed, setAptCollapsed] = useState<Record<string, boolean>>({});
  const [showPTApt,       setShowPTApt]       = useState<Record<string,boolean>>({});
  const [showPTComApt,    setShowPTComApt]    = useState<Record<string,boolean>>({});
  const [showPTComAvulso, setShowPTComAvulso] = useState<Record<string,boolean>>({});

  const togglePav = (pi: number) => setPavCollapsed(p => ({ ...p, [pi]: !p[pi] }));
  const toggleApt = (pi: number, ai: number) => setAptCollapsed(p => { const k = `${pi}-${ai}`; return { ...p, [k]: !p[k] }; });

  const precoMap = Object.fromEntries(form.precos.map(p => [p.etapa, n(p.preco_m2)]));

  const abrirParaOrcar = useCallback(async (obra: ObraLista) => {
    setObraParaOrcar(obra);
    setErro(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (obra.pavimentos.length === 0) {
      setForm(emptyForm());
      return;
    }

    setLoadingEdit(true);
    try {
      const r = await fetch(`${API}/obras/${obra.id}`);
      const j = await r.json();
      const o = j.data;
      if (!o) { setForm(emptyForm()); return; }

      const idToNome: Record<string, string> = Object.fromEntries(
        (o.preco_tipos ?? []).map((t: any) => [t.id, t.nome])
      );

      const mapComodoToForm = (c: any): ComodoForm => ({
        tipo: c.tipo ?? "sala",
        nome: c.nome ?? "",
        paredes: Array.isArray(c.paredes) && c.paredes.length > 0
          ? c.paredes.map((p: any) => ({ m2: String(Number(p.m2)), cor: p.cor ?? "" }))
          : [{ m2: String(Number(c.parede1_m2 ?? 0) + Number(c.parede2_m2 ?? 0) + Number(c.parede3_m2 ?? 0) + Number(c.parede4_m2 ?? 0)), cor: "" }],
        tetos: Array.isArray(c.tetos) && c.tetos.length > 0
          ? c.tetos.map((t: any) => ({ m2: String(Number(t.m2)) }))
          : [{ m2: String(Number(c.teto_m2 ?? 0)) }],
        preco_tipo_nome: c.preco_tipo_id ? (idToNome[c.preco_tipo_id] ?? "") : "",
      });

      const precos: PrecoForm[] = ETAPAS.map(e => {
        const found = (o.obra_precos ?? []).find((p: any) => p.etapa === e.value);
        return { etapa: e.value, preco_m2: found ? String(Number(found.preco_m2)) : "" };
      });

      const preco_tipos: PrecoTipoForm[] = (o.preco_tipos ?? []).map((pt: any) => ({
        nome: pt.nome,
        precos: Object.fromEntries(
          ETAPAS.map(e => {
            const found = (pt.precos ?? []).find((p: any) => p.etapa === e.value);
            return [e.value, found ? String(Number(found.preco_m2)) : ""];
          })
        ),
      }));

      const apartamento_tipos: string[] = (o.apartamento_tipos ?? []).map((t: any) => t.nome);

      const pavimentos: PavimentoForm[] = (o.pavimentos ?? []).map((pav: any) => ({
        nome: pav.nome ?? "",
        numero: String(pav.numero ?? ""),
        tipo: pav.tipo ?? "pavimento",
        comodos: (pav.comodos ?? []).map(mapComodoToForm),
        apartamentos: (pav.apartamentos ?? []).map((apt: any) => ({
          nome: apt.nome ?? "",
          numero: apt.numero != null ? String(apt.numero) : "",
          tipo_nome: apt.apartamento_tipos?.nome ?? "",
          preco_tipo_nome: apt.preco_tipo_id ? (idToNome[apt.preco_tipo_id] ?? "") : "",
          comodos: (apt.comodos ?? []).map(mapComodoToForm),
        })),
      }));

      setForm({ nome: o.nome, local: o.local ?? "", empreiteira_id: o.empreiteira_id ?? "", nova_empreiteira: "", precos, preco_tipos, pavimentos, apartamento_tipos });
    } catch { setForm(emptyForm()); } finally { setLoadingEdit(false); }
  }, []);

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

  const obrasNegociacao = obras.filter(o => o.status === "negociacao");
  const obrasAtivas     = obras.filter(o => o.status !== "negociacao");

  const obrasFiltradas = busca.trim()
    ? obrasAtivas.filter(o => {
        const q = busca.toLowerCase();
        const emp = o.empreiteiras?.nome ?? o.empreiteira ?? "";
        return o.nome.toLowerCase().includes(q) || (o.local ?? "").toLowerCase().includes(q) || emp.toLowerCase().includes(q);
      })
    : obrasAtivas;

  const pagObras = usePagination(obrasFiltradas);

  const setObra        = (f: "nome" | "local", v: string) => setForm(p => ({ ...p, [f]: v }));
  const setPreco       = (i: number, v: string)           => setForm(p => { const a = [...p.precos]; a[i] = { ...a[i], preco_m2: v }; return { ...p, precos: a }; });
  const addPav         = ()                               => setForm(p => ({ ...p, pavimentos: [...p.pavimentos, emptyPavimento()] }));
  const removePav      = (pi: number)                     => setForm(p => ({ ...p, pavimentos: p.pavimentos.filter((_, i) => i !== pi) }));
  const setPavField    = (pi: number, f: "nome" | "numero" | "tipo", v: string) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], [f]: v }; return { ...p, pavimentos: a }; });

  // cômodos avulsos do pavimento
  const addComodoAvulso    = (pi: number) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: [...a[pi].comodos, emptyComodo()] }; return { ...p, pavimentos: a }; });
  const removeComodoAvulso = (pi: number, ci: number) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: a[pi].comodos.filter((_, i) => i !== ci) }; return { ...p, pavimentos: a }; });
  const updComodoAvulso    = (pi: number, ci: number, fn: (c: ComodoForm) => ComodoForm) => setForm(p => {
    const a = [...p.pavimentos]; const cs = [...a[pi].comodos]; cs[ci] = fn(cs[ci]); a[pi] = { ...a[pi], comodos: cs }; return { ...p, pavimentos: a };
  });

  // apartamentos do pavimento
  const addApt    = (pi: number) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], apartamentos: [...a[pi].apartamentos, emptyApartamento()] }; return { ...p, pavimentos: a }; });
  const removeApt = (pi: number, ai: number) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], apartamentos: a[pi].apartamentos.filter((_, i) => i !== ai) }; return { ...p, pavimentos: a }; });
  const setAptField = (pi: number, ai: number, f: keyof Pick<ApartamentoForm, "nome" | "numero" | "tipo_nome" | "preco_tipo_nome">, v: string) => setForm(p => {
    const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; apts[ai] = { ...apts[ai], [f]: v }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a };
  });

  // preco_tipos
  const addPrecoTipo    = () => setForm(p => ({ ...p, preco_tipos: [...p.preco_tipos, emptyPrecoTipo()] }));
  const removePrecoTipo = (ti: number) => setForm(p => ({ ...p, preco_tipos: p.preco_tipos.filter((_, i) => i !== ti) }));
  const setPTNome       = (ti: number, v: string) => setForm(p => { const a = [...p.preco_tipos]; a[ti] = { ...a[ti], nome: v }; return { ...p, preco_tipos: a }; });
  const setPTPreco      = (ti: number, etapa: string, v: string) => setForm(p => { const a = [...p.preco_tipos]; a[ti] = { ...a[ti], precos: { ...a[ti].precos, [etapa]: v } }; return { ...p, preco_tipos: a }; });

  // cômodos dentro de um apartamento
  const addComodoApt    = (pi: number, ai: number) => setForm(p => { const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; apts[ai] = { ...apts[ai], comodos: [...apts[ai].comodos, emptyComodo()] }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a }; });
  const removeComodoApt = (pi: number, ai: number, ci: number) => setForm(p => { const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; apts[ai] = { ...apts[ai], comodos: apts[ai].comodos.filter((_, i) => i !== ci) }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a }; });
  const updComodoApt    = (pi: number, ai: number, ci: number, fn: (c: ComodoForm) => ComodoForm) => setForm(p => {
    const a = [...p.pavimentos]; const apts = [...a[pi].apartamentos]; const cs = [...apts[ai].comodos]; cs[ci] = fn(cs[ci]); apts[ai] = { ...apts[ai], comodos: cs }; a[pi] = { ...a[pi], apartamentos: apts }; return { ...p, pavimentos: a };
  });

  const calcComodoTotal = (c: ComodoForm, aptTipoNome = "") => {
    const aptPrecoMap = resolvePrecoMapForm(aptTipoNome, form.preco_tipos, precoMap);
    return calcOrcComodo(c, resolvePrecoMapForm(c.preco_tipo_nome, form.preco_tipos, aptPrecoMap)).total;
  };

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
          apts[ai].comodos[0].paredes.every(p => !n(p.m2));
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
    const apts    = pav.apartamentos.reduce((as, apt) =>
      as + apt.comodos.reduce((cs, c) => cs + calcComodoTotal(c, apt.preco_tipo_nome), 0), 0);
    return s + avulsos + apts;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null); setSub(true);
    try {
      const mapComodo = (c: ComodoForm) => ({
        tipo: c.tipo, nome: c.nome || null,
        paredes: c.paredes.map(p => ({ m2: n(p.m2), cor: p.cor || null })),
        tetos:   c.tetos.map(t => ({ m2: n(t.m2) })),
        preco_tipo_nome: c.preco_tipo_nome || null,
      });

      const parcialPayload = {
        precos: form.precos.filter(p => p.preco_m2 !== "").map(p => ({ etapa: p.etapa, preco_m2: n(p.preco_m2) })),
        preco_tipos: form.preco_tipos.filter(t => t.nome.trim()).map(t => ({
          nome: t.nome.trim(),
          precos: ETAPAS.filter(e => t.precos[e.value] !== "" && t.precos[e.value] != null)
            .map(e => ({ etapa: e.value, preco_m2: n(t.precos[e.value]) })),
        })),
        apartamento_tipos: form.apartamento_tipos.filter(t => t.trim() !== ""),
        pavimentos: form.pavimentos.map(pav => ({
          nome: pav.nome,
          numero: parseInt(pav.numero) || 0,
          tipo: pav.tipo || "pavimento",
          apartamentos: pav.apartamentos.map(apt => ({
            nome: apt.nome || null,
            numero: apt.numero ? parseInt(apt.numero) : null,
            tipo_nome: apt.tipo_nome || null,
            preco_tipo_nome: apt.preco_tipo_nome || null,
            comodos: apt.comodos.map(mapComodo),
          })),
          comodos: pav.comodos.map(mapComodo),
        })),
      };

      if (!obraParaOrcar) return;
      const r = await fetch(`${API}/obras/${obraParaOrcar.id}/orcamento`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parcialPayload),
      });
      if (!r.ok) { const j = await r.json(); toastError(j.error ?? "Erro ao salvar"); setErro(j.error ?? "Erro ao salvar"); return; }
      toastSuccess("Orçamento registrado com sucesso!");
      setForm(emptyForm()); setShowForm(false); setObraParaOrcar(null); await fetchObras();
    } catch { toastError("Erro de conexão com a API"); setErro("Erro de conexão com a API"); } finally { setSub(false); }
  };

  const handleDelete = async (obraId: string) => {
    setDeleting(true);
    try {
      const r = await fetch(`${API}/obras/${obraId}`, { method: "DELETE" });
      if (r.ok) {
        toastSuccess("Obra excluída.");
        setConfirmDelete(null);
        setObras(prev => prev.filter(o => o.id !== obraId));
      }
    } finally { setDeleting(false); }
  };

  const nomeEmpreiteira = (o: ObraLista) => o.empreiteiras?.nome ?? o.empreiteira ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", fontSize: "0.72rem", color: "rgba(26,42,58,0.4)", marginBottom: "clamp(1.25rem,3vw,2rem)" }}>
        <Link href="/" style={{ color: "rgba(26,42,58,0.4)", textDecoration: "none", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#1A2A3A"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.4)"}
        >Dashboard</Link>
        <span>/</span>
        <span style={{ color: "#1A2A3A", fontWeight: 500 }}>Obras</span>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: "clamp(1.5rem,3vw,2rem)" }}>
        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "6px" }}>
          Obras
        </h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)" }}>
          {loading ? "Carregando..." : `${obras.length} obra${obras.length !== 1 ? "s" : ""}${obrasNegociacao.length > 0 ? ` · ${obrasNegociacao.length} em negociação` : ""}`}
        </p>
      </div>

      {/* Form de orçamento (abre ao clicar em card em negociação) */}
      {showForm && obraParaOrcar && !loadingEdit && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 overflow-hidden">

          {/* Dados da obra (somente leitura) */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">Orçamento de Mão de Obra</h2>
            {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-wrap items-start gap-x-6 gap-y-1">
              <div>
                <span className="text-xs text-amber-600 font-medium">Obra</span>
                <p className="text-sm font-semibold text-zinc-900">{obraParaOrcar.nome}</p>
              </div>
              {obraParaOrcar.local && (
                <div>
                  <span className="text-xs text-amber-600 font-medium">Local</span>
                  <p className="text-sm text-zinc-700">{obraParaOrcar.local}</p>
                </div>
              )}
              {(obraParaOrcar.empreiteiras?.nome ?? obraParaOrcar.empreiteira) && (
                <div>
                  <span className="text-xs text-amber-600 font-medium">Construtora</span>
                  <p className="text-sm text-zinc-700">{obraParaOrcar.empreiteiras?.nome ?? obraParaOrcar.empreiteira}</p>
                </div>
              )}
            </div>
          </div>

          {/* Precos */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Preço por m² / Etapa</h2>
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

          {/* Tipos de Preço */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Tipos de Preço</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Opcional · grupos de preço/m² alternativos ao padrão (ex: Tinta Epóxi, Massa Premium)</p>
              </div>
              <button type="button" onClick={addPrecoTipo}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                + Tipo de Preço
              </button>
            </div>
            {form.preco_tipos.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">Nenhum tipo definido. Tipos permitem preços distintos por etapa para grupos específicos de cômodos.</p>
            ) : (
              <div className="space-y-3">
                {form.preco_tipos.map((pt, ti) => (
                  <div key={ti} className="border border-amber-100 rounded-lg p-3 bg-amber-50/30">
                    <div className="flex items-center gap-2 mb-2">
                      <input value={pt.nome} onChange={e => setPTNome(ti, e.target.value)}
                        className={`flex-1 min-w-32 ${INPUT_SM}`} placeholder="Ex: Tinta Epóxi, Massa Premium..." />
                      <button type="button" onClick={() => removePrecoTipo(ti)}
                        className="text-zinc-300 hover:text-red-400 text-lg leading-none px-1">×</button>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">Preços/m² — deixe em branco para usar o padrão da obra nessa etapa:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {ETAPAS.map(et => {
                        const geralStr = form.precos.find(p => p.etapa === et.value)?.preco_m2;
                        return (
                          <div key={et.value}>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                              {et.label}
                              {geralStr && <span className="text-zinc-300 font-normal ml-1">({fmt(n(geralStr))})</span>}
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">R$</span>
                              <input type="number" step="0.01" min="0" value={pt.precos[et.value] ?? ""}
                                onChange={e => setPTPreco(ti, et.value, e.target.value)}
                                className="w-full border border-zinc-200 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-900 bg-white placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="—" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                const aptTotal  = pav.apartamentos.reduce((s, apt) => s + apt.comodos.reduce((cs, c) => cs + calcComodoTotal(c, apt.preco_tipo_nome), 0), 0);
                const avulTotal = pav.comodos.reduce((s, c) => s + calcComodoTotal(c), 0);
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
                      {pavCollapsed[pi] && (pav.apartamentos.length > 0 || pav.comodos.length > 0) && (
                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                          {pav.apartamentos.length > 0 && `${pav.apartamentos.length} apto${pav.apartamentos.length !== 1 ? "s" : ""}`}
                          {pav.apartamentos.length > 0 && pav.comodos.length > 0 && " · "}
                          {pav.comodos.length > 0 && `${pav.comodos.length} avulso${pav.comodos.length !== 1 ? "s" : ""}`}
                        </span>
                      )}
                      {pavTotal > 0 && <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{fmt(pavTotal)}</span>}
                      <button type="button" onClick={() => togglePav(pi)}
                        className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded"
                        title={pavCollapsed[pi] ? "Expandir" : "Minimizar"}>
                        <ChevronDown size={15} style={{ transition: "transform 0.2s", transform: pavCollapsed[pi] ? "rotate(-90deg)" : "rotate(0deg)" }} />
                      </button>
                      {form.pavimentos.length > 1 && (
                        <button type="button" onClick={() => removePav(pi)}
                          className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-1">Remover</button>
                      )}
                    </div>

                    {!pavCollapsed[pi] && <div className="divide-y divide-zinc-100">

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
                              const aptComodoTotal = apt.comodos.reduce((s, c) => s + calcComodoTotal(c, apt.preco_tipo_nome), 0);
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
                                    {form.preco_tipos.filter(t => t.nome.trim()).length > 0 && (
                                      !showPTApt[`${pi}-${ai}`] ? (
                                        <button type="button"
                                          onClick={() => setShowPTApt(p => ({...p, [`${pi}-${ai}`]: true}))}
                                          className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 whitespace-nowrap">
                                          <span>Personalizar preço</span>
                                          <ChevronDown size={11}/>
                                        </button>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <select value={apt.preco_tipo_nome}
                                            onChange={e => setAptField(pi, ai, "preco_tipo_nome", e.target.value)}
                                            className="border border-amber-200 rounded-lg px-2 py-1.5 text-xs text-zinc-900 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                            <option value="">— Padrão geral —</option>
                                            {form.preco_tipos.filter(t => t.nome.trim()).map(t => (
                                              <option key={t.nome} value={t.nome}>{t.nome}</option>
                                            ))}
                                          </select>
                                          <button type="button"
                                            onClick={() => { setShowPTApt(p => ({...p, [`${pi}-${ai}`]: false})); setAptField(pi, ai, "preco_tipo_nome", ""); }}
                                            className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                        </div>
                                      )
                                    )}
                                    {aptCollapsed[`${pi}-${ai}`] && apt.comodos.length > 0 && (
                                      <span className="text-xs text-zinc-400 whitespace-nowrap">{apt.comodos.length} cômodo{apt.comodos.length !== 1 ? "s" : ""}</span>
                                    )}
                                    {aptComodoTotal > 0 && <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{fmt(aptComodoTotal)}</span>}
                                    <button type="button" onClick={() => toggleApt(pi, ai)}
                                      className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded"
                                      title={aptCollapsed[`${pi}-${ai}`] ? "Expandir" : "Minimizar"}>
                                      <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: aptCollapsed[`${pi}-${ai}`] ? "rotate(-90deg)" : "rotate(0deg)" }} />
                                    </button>
                                    <button type="button" onClick={() => removeApt(pi, ai)}
                                      className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-1">Remover</button>
                                  </div>

                                  {/* Cômodos do apartamento */}
                                  {!aptCollapsed[`${pi}-${ai}`] && <div className="p-3 space-y-2">
                                    {apt.comodos.map((c, ci) => {
                                      const orc = calcOrcComodo(c, resolvePrecoMapForm(c.preco_tipo_nome, form.preco_tipos, resolvePrecoMapForm(apt.preco_tipo_nome, form.preco_tipos, precoMap)));
                                      return (
                                        <div key={ci} className="border border-zinc-100 rounded-lg p-2.5 space-y-2 bg-white">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <select value={c.tipo} onChange={e => updComodoApt(pi, ai, ci, c => ({...c, tipo: e.target.value}))}
                                              className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                              {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                            <input value={c.nome} onChange={e => updComodoApt(pi, ai, ci, c => ({...c, nome: e.target.value}))}
                                              className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome opcional" />
                                            {orc.total > 0 && <span className="text-xs font-bold text-orange-600">{fmt(orc.total)}</span>}
                                            <button type="button" onClick={() => addComodoApt(pi, ai)}
                                              className="text-xs text-orange-600 border border-orange-200 rounded-lg px-2 py-1.5 hover:border-orange-400 transition-colors whitespace-nowrap">+ Cômodo</button>
                                            {apt.comodos.length > 1 && (
                                              <button type="button" onClick={() => removeComodoApt(pi, ai, ci)}
                                                className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 rounded-lg px-2 py-1.5 transition-colors">Remover</button>
                                            )}
                                          </div>
                                          {/* Paredes */}
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-zinc-400">Paredes</span>
                                              <button type="button" onClick={() => updComodoApt(pi, ai, ci, c => ({...c, paredes:[...c.paredes,{m2:"",cor:""}]}))}
                                                className="text-xs text-orange-500 hover:text-orange-700">+ parede</button>
                                            </div>
                                            {c.paredes.map((p, pIdx) => (
                                              <div key={pIdx} className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs text-zinc-300 w-12 shrink-0">Parede {pIdx+1}</span>
                                                <input type="number" step="0.01" min="0" value={p.m2}
                                                  onChange={e => updComodoApt(pi, ai, ci, c => { const ps=[...c.paredes]; ps[pIdx]={...ps[pIdx],m2:e.target.value}; return {...c,paredes:ps}; })}
                                                  className={`w-20 ${INPUT_SM}`} placeholder="m²" />
                                                <input type="color" value={p.cor||"#ffffff"}
                                                  onChange={e => updComodoApt(pi, ai, ci, c => { const ps=[...c.paredes]; ps[pIdx]={...ps[pIdx],cor:e.target.value}; return {...c,paredes:ps}; })}
                                                  className="w-7 h-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white shrink-0" title="Cor" />
                                                <input type="text" value={p.cor||""}
                                                  onChange={e => updComodoApt(pi, ai, ci, c => { const ps=[...c.paredes]; ps[pIdx]={...ps[pIdx],cor:e.target.value}; return {...c,paredes:ps}; })}
                                                  className={`w-20 ${INPUT_SM} font-mono text-xs`} placeholder="#rrggbb" />
                                                {c.paredes.length > 1 && (
                                                  <button type="button" onClick={() => updComodoApt(pi, ai, ci, c => ({...c, paredes:c.paredes.filter((_,i)=>i!==pIdx)}))}
                                                    className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                          {/* Tetos */}
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-zinc-400">Tetos</span>
                                              <button type="button" onClick={() => updComodoApt(pi, ai, ci, c => ({...c, tetos:[...c.tetos,{m2:""}]}))}
                                                className="text-xs text-orange-500 hover:text-orange-700">+ teto</button>
                                            </div>
                                            {c.tetos.map((t, tIdx) => (
                                              <div key={tIdx} className="flex items-center gap-1.5">
                                                <span className="text-xs text-zinc-300 w-12 shrink-0">Teto {tIdx+1}</span>
                                                <input type="number" step="0.01" min="0" value={t.m2}
                                                  onChange={e => updComodoApt(pi, ai, ci, c => { const ts=[...c.tetos]; ts[tIdx]={m2:e.target.value}; return {...c,tetos:ts}; })}
                                                  className={`w-20 ${INPUT_SM}`} placeholder="m²" />
                                                {c.tetos.length > 1 && (
                                                  <button type="button" onClick={() => updComodoApt(pi, ai, ci, c => ({...c, tetos:c.tetos.filter((_,i)=>i!==tIdx)}))}
                                                    className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                          {/* Tipo de preço */}
                                          {form.preco_tipos.filter(t => t.nome.trim()).length > 0 && (
                                            !showPTComApt[`${pi}-${ai}-${ci}`] ? (
                                              <button type="button"
                                                onClick={() => setShowPTComApt(p => ({...p, [`${pi}-${ai}-${ci}`]: true}))}
                                                className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5">
                                                <span>Personalizar preço</span>
                                                <ChevronDown size={11}/>
                                              </button>
                                            ) : (
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs text-zinc-400 shrink-0">Tipo de preço:</span>
                                                <select value={c.preco_tipo_nome}
                                                  onChange={e => updComodoApt(pi, ai, ci, c => ({...c, preco_tipo_nome: e.target.value}))}
                                                  className="flex-1 min-w-32 border border-amber-200 rounded-lg px-2 py-1 text-xs text-zinc-900 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                                  <option value="">— Padrão geral —</option>
                                                  {form.preco_tipos.filter(t => t.nome.trim()).map(t => (
                                                    <option key={t.nome} value={t.nome}>{t.nome}</option>
                                                  ))}
                                                </select>
                                                <button type="button"
                                                  onClick={() => { setShowPTComApt(p => ({...p, [`${pi}-${ai}-${ci}`]: false})); updComodoApt(pi, ai, ci, c => ({...c, preco_tipo_nome: ""})); }}
                                                  className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>}
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
                              const orc = calcOrcComodo(c, resolvePrecoMapForm(c.preco_tipo_nome, form.preco_tipos, precoMap));
                              return (
                                <div key={ci} className="border border-zinc-100 rounded-lg p-2.5 space-y-2 bg-zinc-50/50">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <select value={c.tipo} onChange={e => updComodoAvulso(pi, ci, c => ({...c, tipo: e.target.value}))}
                                      className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                      {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <input value={c.nome} onChange={e => updComodoAvulso(pi, ci, c => ({...c, nome: e.target.value}))}
                                      className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome opcional" />
                                    {orc.total > 0 && <span className="text-xs font-bold text-orange-600">{fmt(orc.total)}</span>}
                                    <button type="button" onClick={() => removeComodoAvulso(pi, ci)}
                                      className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 rounded-lg px-2 py-1.5 transition-colors">Remover</button>
                                  </div>
                                  {/* Paredes */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-zinc-400">Paredes</span>
                                      <button type="button" onClick={() => updComodoAvulso(pi, ci, c => ({...c, paredes:[...c.paredes,{m2:"",cor:""}]}))}
                                        className="text-xs text-orange-500 hover:text-orange-700">+ parede</button>
                                    </div>
                                    {c.paredes.map((p, pIdx) => (
                                      <div key={pIdx} className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs text-zinc-300 w-12 shrink-0">Parede {pIdx+1}</span>
                                        <input type="number" step="0.01" min="0" value={p.m2}
                                          onChange={e => updComodoAvulso(pi, ci, c => { const ps=[...c.paredes]; ps[pIdx]={...ps[pIdx],m2:e.target.value}; return {...c,paredes:ps}; })}
                                          className={`w-20 ${INPUT_SM}`} placeholder="m²" />
                                        <input type="color" value={p.cor||"#ffffff"}
                                          onChange={e => updComodoAvulso(pi, ci, c => { const ps=[...c.paredes]; ps[pIdx]={...ps[pIdx],cor:e.target.value}; return {...c,paredes:ps}; })}
                                          className="w-7 h-7 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white shrink-0" title="Cor" />
                                        <input type="text" value={p.cor||""}
                                          onChange={e => updComodoAvulso(pi, ci, c => { const ps=[...c.paredes]; ps[pIdx]={...ps[pIdx],cor:e.target.value}; return {...c,paredes:ps}; })}
                                          className={`w-20 ${INPUT_SM} font-mono text-xs`} placeholder="#rrggbb" />
                                        {c.paredes.length > 1 && (
                                          <button type="button" onClick={() => updComodoAvulso(pi, ci, c => ({...c, paredes:c.paredes.filter((_,i)=>i!==pIdx)}))}
                                            className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Tetos */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-zinc-400">Tetos</span>
                                      <button type="button" onClick={() => updComodoAvulso(pi, ci, c => ({...c, tetos:[...c.tetos,{m2:""}]}))}
                                        className="text-xs text-orange-500 hover:text-orange-700">+ teto</button>
                                    </div>
                                    {c.tetos.map((t, tIdx) => (
                                      <div key={tIdx} className="flex items-center gap-1.5">
                                        <span className="text-xs text-zinc-300 w-12 shrink-0">Teto {tIdx+1}</span>
                                        <input type="number" step="0.01" min="0" value={t.m2}
                                          onChange={e => updComodoAvulso(pi, ci, c => { const ts=[...c.tetos]; ts[tIdx]={m2:e.target.value}; return {...c,tetos:ts}; })}
                                          className={`w-20 ${INPUT_SM}`} placeholder="m²" />
                                        {c.tetos.length > 1 && (
                                          <button type="button" onClick={() => updComodoAvulso(pi, ci, c => ({...c, tetos:c.tetos.filter((_,i)=>i!==tIdx)}))}
                                            className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Tipo de preço */}
                                  {form.preco_tipos.filter(t => t.nome.trim()).length > 0 && (
                                    !showPTComAvulso[`${pi}-${ci}`] ? (
                                      <button type="button"
                                        onClick={() => setShowPTComAvulso(p => ({...p, [`${pi}-${ci}`]: true}))}
                                        className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5">
                                        <span>Personalizar preço</span>
                                        <ChevronDown size={11}/>
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs text-zinc-400 shrink-0">Tipo de preço:</span>
                                        <select value={c.preco_tipo_nome}
                                          onChange={e => updComodoAvulso(pi, ci, c => ({...c, preco_tipo_nome: e.target.value}))}
                                          className="flex-1 min-w-32 border border-amber-200 rounded-lg px-2 py-1 text-xs text-zinc-900 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                          <option value="">— Padrão geral —</option>
                                          {form.preco_tipos.filter(t => t.nome.trim()).map(t => (
                                            <option key={t.nome} value={t.nome}>{t.nome}</option>
                                          ))}
                                        </select>
                                        <button type="button"
                                          onClick={() => { setShowPTComAvulso(p => ({...p, [`${pi}-${ci}`]: false})); updComodoAvulso(pi, ci, c => ({...c, preco_tipo_nome: ""})); }}
                                          className="text-zinc-300 hover:text-red-400 text-sm leading-none">✕</button>
                                      </div>
                                    )
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>}
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
              <button type="button" onClick={() => { setShowForm(false); setObraParaOrcar(null); setErro(null); setForm(emptyForm()); }}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                {submitting ? "Salvando..." : "Enviar Orçamento"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Loading edit overlay */}
      {loadingEdit && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 flex items-center justify-center py-16">
          <p className="text-sm text-zinc-400">Carregando dados do orçamento...</p>
        </div>
      )}

      {/* Obras em Negociação */}
      {!loading && obrasNegociacao.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            Em Negociação
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {obrasNegociacao.map(o => {
              const temOrc = o.pavimentos.length > 0;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => abrirParaOrcar(o)}
                  className="text-left bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                  style={{ borderColor: temOrc ? "#6ee7b7" : "#fcd34d" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-zinc-900 text-sm leading-snug">{o.nome}</p>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${temOrc ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {temOrc ? "Enviado" : "Pendente"}
                    </span>
                  </div>
                  {o.local && <p className="text-xs text-zinc-500 mb-1.5 truncate">{o.local}</p>}
                  {(o.empreiteiras?.nome ?? o.empreiteira) && (
                    <p className="text-xs text-zinc-400">{o.empreiteiras?.nome ?? o.empreiteira}</p>
                  )}
                  {temOrc && (o.orcamento_total ?? 0) > 0 && (
                    <p className="text-xs font-semibold text-emerald-700 mt-1">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.orcamento_total)}
                    </p>
                  )}
                  <p className={`mt-3 text-xs font-medium transition-colors ${temOrc ? "text-emerald-600 group-hover:text-emerald-800" : "text-amber-600 group-hover:text-amber-800"}`}>
                    {temOrc ? "Editar orçamento →" : "Preencher orçamento →"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Busca */}
      {!loading && obrasAtivas.length > 0 && (
        <div style={{ position: "relative", maxWidth: "360px", marginBottom: "16px" }}>
          <Search size={14} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "rgba(26,42,58,0.35)", pointerEvents: "none" }} />
          <input
            type="search" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, local ou empreiteira..."
            style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: "8px", fontSize: "0.875rem", backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.14)", color: "#1A2A3A", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
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
            <p className="text-xs text-zinc-400">{busca ? "Tente outro termo de busca" : "Clique em \"+ Nova Obra\" para começar"}</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div key={pagObras.animKey} className={`md:hidden divide-y divide-zinc-100 ${pagObras.animClass}`}>
              {pagObras.pageItems.map(o => (
                <div key={o.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-zinc-900 text-sm leading-snug" style={{ overflowWrap: "break-word", flex: 1 }}>{o.nome}</p>
                    {(o.orcamento_total ?? 0) > 0 && (
                      <span className="text-sm font-bold text-orange-600 tabular-nums shrink-0 ml-2">{fmt(o.orcamento_total)}</span>
                    )}
                  </div>
                  {o.local && <p className="text-xs text-zinc-500 mb-1 truncate">{o.local}</p>}
                  {nomeEmpreiteira(o) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 mb-2">
                      {nomeEmpreiteira(o)}
                    </span>
                  )}
                  {o.pavimentos.length > 0 && (
                    <p className="text-xs text-zinc-400 mb-3">{o.pavimentos.length} pav. · {o.pavimentos.reduce((s, p) => s + p.comodos.length, 0)} côm.</p>
                  )}
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
                        <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">Não</button>
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
            <div key={`d-${pagObras.animKey}`} className={`hidden md:block overflow-x-auto ${pagObras.animClass}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3">Obra</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Local</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Empreiteira</th>
                    <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Pav.</th>
                    <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Côm.</th>
                    <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Orçamento</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagObras.pageItems.map((o, idx) => (
                    <tr key={o.id} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors ${idx % 2 === 0 ? "" : "bg-zinc-50/30"}`}>
                      <td className="px-6 py-4 font-semibold text-zinc-900 max-w-[200px]">
                        <span style={{ display: "block", overflowWrap: "break-word" }}>{o.nome}</span>
                      </td>
                      <td className="px-4 py-4 text-zinc-500 text-xs max-w-[160px] truncate">{o.local ?? <span className="text-zinc-300">—</span>}</td>
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
                              <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">Não</button>
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

            <div className="px-4 sm:px-6 pb-4">
              <Pagination
                page={pagObras.page} totalPages={pagObras.totalPages}
                from={pagObras.from} to={pagObras.to} total={pagObras.total}
                onPrev={pagObras.goPrev} onNext={pagObras.goNext}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
