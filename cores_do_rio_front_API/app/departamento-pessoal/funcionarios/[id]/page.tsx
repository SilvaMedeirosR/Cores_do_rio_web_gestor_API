"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_DEP_PESS ?? "";
// v2

const INPUT  = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow disabled:bg-zinc-50 disabled:text-zinc-400";
const SELECT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow appearance-none disabled:bg-zinc-50 disabled:text-zinc-400";
const LABEL  = "block text-xs font-medium text-zinc-500 mb-1.5";

const DIAS        = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_VALUES = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];

const ESCOLARIDADE_OPTS = [
  { value: "fundamental_incompleto", label: "Fundamental Incompleto"     },
  { value: "fundamental_completo",   label: "Fundamental Completo"       },
  { value: "medio_incompleto",       label: "Médio Incompleto"           },
  { value: "medio_completo",         label: "Médio Completo"             },
  { value: "tecnico",                label: "Técnico/Profissionalizante" },
  { value: "superior_incompleto",    label: "Superior Incompleto"        },
  { value: "superior_completo",      label: "Superior Completo"          },
  { value: "pos_graduacao",          label: "Pós-graduação"              },
  { value: "mestrado",               label: "Mestrado"                   },
  { value: "doutorado",              label: "Doutorado"                  },
];

const UF_OPTS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const ESCOLARIDADE_LABEL: Record<string, string> = Object.fromEntries(
  ESCOLARIDADE_OPTS.map(o => [o.value, o.label])
);

interface RawFuncionario {
  id: string; nome: string; cpf: string | null; nis: string | null;
  data_nascimento: string | null; cep: string | null; logradouro: string | null;
  numero_end: string | null; complemento: string | null; bairro: string | null;
  municipio: string | null; uf: string | null; email: string | null;
  telefone: string | null; escolaridade: string | null;
  cargo: string | null; matricula: string | null; cbo: string | null;
  cbo_descricao: string | null; tipo_contrato: string | null;
  data_admissao: string | null; data_fim_contrato: string | null;
  horario_entrada: string | null; horario_saida: string | null; dias_trabalho: string | null;
  salario: number | null; unidade_pagamento: string | null;
  adicional_periculosidade: boolean; adicional_insalubridade: string | null;
  status: string; created_at: string;
}

interface Alteracao {
  id: string;
  funcionario_id: string;
  tipo_evento: string;
  motivo: string | null;
  data_alteracao: string;
  competencia: string;
  prazo_esocial: string;
  campos_alterados: { de: Record<string, unknown>; para: Record<string, unknown> };
  status_esocial: string;
  protocolo_dominio: string | null;
  observacoes: string | null;
  created_at: string;
}

type Form = {
  nome: string; cpf: string; nis: string; data_nascimento: string;
  cep: string; logradouro: string; numero_end: string; complemento: string;
  bairro: string; municipio: string; uf: string;
  email: string; telefone: string; escolaridade: string;
  cargo: string; matricula: string; cbo: string; cbo_descricao: string;
  tipo_contrato: string; data_admissao: string; data_fim_contrato: string;
  horario_entrada: string; horario_saida: string; dias_trabalho: string[];
  salario: string; unidade_pagamento: string;
  adicional_periculosidade: boolean; adicional_insalubridade: string;
};

type AltForm = {
  tipo_evento: string;
  motivo: string;
  data_alteracao: string;
  competencia: string;
  observacoes: string;
  salario: string;
  unidade_pagamento: string;
  cargo: string;
  cbo: string;
  cbo_descricao: string;
  horario_entrada: string;
  horario_saida: string;
  dias_trabalho: string[];
  tipo_contrato: string;
  data_fim_contrato: string;
};

const DEFAULT_ALT: AltForm = {
  tipo_evento: "", motivo: "", data_alteracao: "", competencia: "",
  observacoes: "", salario: "", unidade_pagamento: "mes",
  cargo: "", cbo: "", cbo_descricao: "",
  horario_entrada: "", horario_saida: "", dias_trabalho: [],
  tipo_contrato: "indeterminado", data_fim_contrato: "",
};

function dataToForm(d: RawFuncionario): Form {
  return {
    nome: d.nome, cpf: d.cpf ?? "", nis: d.nis ?? "",
    data_nascimento: d.data_nascimento ?? "",
    cep: d.cep ?? "", logradouro: d.logradouro ?? "",
    numero_end: d.numero_end ?? "", complemento: d.complemento ?? "",
    bairro: d.bairro ?? "", municipio: d.municipio ?? "", uf: d.uf ?? "",
    email: d.email ?? "", telefone: d.telefone ?? "", escolaridade: d.escolaridade ?? "",
    cargo: d.cargo ?? "", matricula: d.matricula ?? "",
    cbo: d.cbo ?? "", cbo_descricao: d.cbo_descricao ?? "",
    tipo_contrato: d.tipo_contrato ?? "indeterminado",
    data_admissao: d.data_admissao ?? "", data_fim_contrato: d.data_fim_contrato ?? "",
    horario_entrada: d.horario_entrada ?? "", horario_saida: d.horario_saida ?? "",
    dias_trabalho: d.dias_trabalho ? d.dias_trabalho.split(",").filter(Boolean) : [],
    salario: d.salario != null ? String(d.salario) : "",
    unidade_pagamento: d.unidade_pagamento ?? "mes",
    adicional_periculosidade: d.adicional_periculosidade,
    adicional_insalubridade: d.adicional_insalubridade ?? "",
  };
}

const fmt     = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
const unid    = (u: string | null) => u === "hora" ? "/h" : u === "dia" ? "/dia" : "/mês";

const formatTel = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

const formatCEP = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0,5)}-${d.slice(5)}`;
};

const TIPO_EVENTO_LABEL: Record<string, string> = {
  alteracao_salario:       "Alteração Salarial",
  mudanca_cargo:           "Mudança de Cargo/CBO",
  alteracao_jornada:       "Alteração de Jornada",
  alteracao_tipo_contrato: "Alteração de Tipo de Contrato",
};

const MOTIVO_LABEL: Record<string, string> = {
  reajuste:        "Reajuste",
  dissidio:        "Dissídio",
  promocao:        "Promoção",
  enquadramento:   "Enquadramento",
};

const STATUS_ESOCIAL_STYLE: Record<string, string> = {
  pendente:  "bg-yellow-50 text-yellow-700",
  enviado:   "bg-blue-50 text-blue-700",
  aprovado:  "bg-green-50 text-green-700",
  rejeitado: "bg-red-50 text-red-700",
};

const TABS = ["Dados Cadastrais", "Dados Contratuais", "Dados Remuneratórios", "Alterações Contratuais"];

export default function FuncionarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const [raw, setRaw]           = useState<RawFuncionario | null>(null);
  const [form, setForm]         = useState<Form | null>(null);
  const [editando, setEditando] = useState(false);
  const [tab, setTab]           = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [cepLoad, setCepLoad]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [sucesso, setSucesso]   = useState<string | null>(null);

  // Alterações
  const [alteracoes, setAlteracoes]     = useState<Alteracao[]>([]);
  const [loadingAlt, setLoadingAlt]     = useState(false);
  const [modalAlt, setModalAlt]         = useState(false);
  const [altForm, setAltForm]           = useState<AltForm>(DEFAULT_ALT);
  const [savingAlt, setSavingAlt]       = useState(false);
  const [erroAlt, setErroAlt]           = useState<string | null>(null);
  const [enviandoId, setEnviandoId]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/funcionarios/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) { setRaw(j.data); setForm(dataToForm(j.data)); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const carregarAlteracoes = () => {
    setLoadingAlt(true);
    fetch(`${API}/funcionarios/${id}/alteracoes`)
      .then(r => r.json())
      .then(j => { setAlteracoes(j.data ?? []); setLoadingAlt(false); })
      .catch(() => setLoadingAlt(false));
  };

  useEffect(() => {
    if (tab === 3) carregarAlteracoes();
  }, [tab]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(p => p ? { ...p, [k]: v } : p);

  const setAlt = <K extends keyof AltForm>(k: K, v: AltForm[K]) =>
    setAltForm(p => ({ ...p, [k]: v }));

  const cancelar = () => {
    if (raw) setForm(dataToForm(raw));
    setEditando(false);
    setErro(null);
  };

  const buscarCEP = async () => {
    if (!form) return;
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoad(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(p => p ? {
          ...p,
          logradouro: d.logradouro || p.logradouro,
          bairro:     d.bairro     || p.bairro,
          municipio:  d.localidade || p.municipio,
          uf:         d.uf         || p.uf,
        } : p);
      }
    } finally {
      setCepLoad(false);
    }
  };

  const toggleDia = (v: string) =>
    setForm(p => p ? {
      ...p,
      dias_trabalho: p.dias_trabalho.includes(v)
        ? p.dias_trabalho.filter(d => d !== v)
        : [...p.dias_trabalho, v],
    } : p);

  const toggleDiaAlt = (v: string) =>
    setAltForm(p => ({
      ...p,
      dias_trabalho: p.dias_trabalho.includes(v)
        ? p.dias_trabalho.filter(d => d !== v)
        : [...p.dias_trabalho, v],
    }));

  const salvar = async () => {
    if (!form) return;
    setErro(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        dias_trabalho:     form.dias_trabalho.join(",") || null,
        salario:           form.salario ? parseFloat(form.salario.replace(",", ".")) : null,
        data_fim_contrato: form.tipo_contrato === "determinado" ? form.data_fim_contrato || null : null,
        adicional_insalubridade: form.adicional_insalubridade || null,
      };
      const r = await fetch(`${API}/funcionarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error ?? "Erro ao salvar."); setSaving(false); return; }
      setRaw(j.data);
      setForm(dataToForm(j.data));
      setEditando(false);
      setSucesso("Dados salvos com sucesso!");
      setTimeout(() => setSucesso(null), 3000);
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  const alternarStatus = async () => {
    if (!raw) return;
    const novoStatus = raw.status === "ativo" ? "inativo" : "ativo";
    const r = await fetch(`${API}/funcionarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (r.ok) {
      const j = await r.json();
      setRaw(j.data);
      if (form) setForm(f => f ? { ...f } : f);
    }
  };

  const buildNovos = (): Record<string, unknown> => {
    switch (altForm.tipo_evento) {
      case "alteracao_salario":
        return {
          salario: altForm.salario ? parseFloat(altForm.salario.replace(",", ".")) : undefined,
          unidade_pagamento: altForm.unidade_pagamento || undefined,
        };
      case "mudanca_cargo":
        return {
          cargo:         altForm.cargo       || undefined,
          cbo:           altForm.cbo         || undefined,
          cbo_descricao: altForm.cbo_descricao || undefined,
        };
      case "alteracao_jornada":
        return {
          horario_entrada: altForm.horario_entrada || undefined,
          horario_saida:   altForm.horario_saida   || undefined,
          dias_trabalho:   altForm.dias_trabalho.join(",") || undefined,
        };
      case "alteracao_tipo_contrato":
        return {
          tipo_contrato:     altForm.tipo_contrato,
          data_fim_contrato: altForm.tipo_contrato === "determinado" ? altForm.data_fim_contrato || null : null,
        };
      default:
        return {};
    }
  };

  const registrarAlteracao = async () => {
    setErroAlt(null);
    if (!altForm.tipo_evento || !altForm.data_alteracao || !altForm.competencia) {
      setErroAlt("Preencha: tipo de evento, data da alteração e competência.");
      return;
    }
    const novos = buildNovos();
    if (Object.keys(novos).length === 0) {
      setErroAlt("Informe ao menos um campo alterado.");
      return;
    }
    setSavingAlt(true);
    try {
      const r = await fetch(`${API}/funcionarios/${id}/alteracoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_evento:   altForm.tipo_evento,
          motivo:        altForm.motivo || null,
          data_alteracao: altForm.data_alteracao,
          competencia:   altForm.competencia,
          observacoes:   altForm.observacoes || null,
          novos_dados:   novos,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErroAlt(j.error ?? "Erro ao registrar."); setSavingAlt(false); return; }
      setModalAlt(false);
      setAltForm(DEFAULT_ALT);
      // Atualiza raw para refletir os campos alterados na UI
      const rFetch = await fetch(`${API}/funcionarios/${id}`);
      const jFetch = await rFetch.json();
      if (jFetch.data) { setRaw(jFetch.data); setForm(dataToForm(jFetch.data)); }
      carregarAlteracoes();
    } catch {
      setErroAlt("Erro de conexão.");
    } finally {
      setSavingAlt(false);
    }
  };

  const enviarAoDominio = async (alteracaoId: string) => {
    setEnviandoId(alteracaoId);
    try {
      const r = await fetch(`${API}/dominio/eventos/s2206/${alteracaoId}`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        alert(j.error ?? "Erro ao enviar ao Domínio.");
      } else {
        carregarAlteracoes();
      }
    } catch {
      alert("Erro de conexão ao enviar ao Domínio.");
    } finally {
      setEnviandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center text-zinc-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (!raw || !form) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-zinc-400 text-sm mb-4">Funcionário não encontrado.</p>
        <Link href="/departamento-pessoal" className="text-orange-600 hover:text-orange-700 text-sm font-medium">← Voltar</Link>
      </div>
    );
  }

  const disabled = !editando;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/departamento-pessoal" className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{raw.nome}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                raw.status === "ativo" ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"
              }`}>
                {raw.status === "ativo" ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="text-zinc-400 text-sm mt-0.5">
              {raw.cbo_descricao ?? raw.cargo ?? "—"}
              {raw.matricula && <span className="ml-2 text-zinc-300">·</span>}
              {raw.matricula && <span className="ml-2">Mat. {raw.matricula}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {tab !== 3 && (
            !editando ? (
              <>
                <button onClick={alternarStatus}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-zinc-400 transition-colors">
                  {raw.status === "ativo" ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => setEditando(true)}
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar
                </button>
              </>
            ) : (
              <>
                <button onClick={cancelar}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-zinc-400 transition-colors">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={saving}
                  className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </>
            )
          )}
          {tab === 3 && (
            <button onClick={() => { setAltForm(DEFAULT_ALT); setErroAlt(null); setModalAlt(true); }}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Registrar Alteração
            </button>
          )}
        </div>
      </div>

      {sucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-6">{sucesso}</div>
      )}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{erro}</div>
      )}

      {/* Tab nav */}
      <div className="flex border-b border-zinc-200 mb-8 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === i ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
              tab === i ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
            }`}>{i + 1}</span>
            <span className="hidden sm:inline">{t}</span>
          </button>
        ))}
      </div>

      {/* ── Tab 0: Dados Cadastrais ── */}
      {tab === 0 && (
        <div className="space-y-5">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Identificação</h2>

            <div>
              <label className={LABEL}>Nome Completo</label>
              <input type="text" value={form.nome} disabled={disabled} onChange={e => set("nome", e.target.value)} className={INPUT} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>CPF</label>
                <input type="text" value={form.cpf} disabled={disabled} onChange={e => set("cpf", e.target.value)} className={`${INPUT} font-mono`} />
              </div>
              <div>
                <label className={LABEL}>NIS / PIS / PASEP</label>
                <input type="text" value={form.nis} disabled={disabled} onChange={e => set("nis", e.target.value)} className={`${INPUT} font-mono`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Data de Nascimento</label>
                <input type="date" value={form.data_nascimento} disabled={disabled} onChange={e => set("data_nascimento", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Escolaridade</label>
                {disabled ? (
                  <input type="text" value={form.escolaridade ? (ESCOLARIDADE_LABEL[form.escolaridade] ?? form.escolaridade) : "—"} disabled className={INPUT} />
                ) : (
                  <select value={form.escolaridade} onChange={e => set("escolaridade", e.target.value)} className={SELECT}>
                    <option value="">Selecione...</option>
                    {ESCOLARIDADE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Endereço</h2>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={LABEL}>CEP</label>
                <input type="text" value={form.cep} disabled={disabled} onChange={e => set("cep", formatCEP(e.target.value))} onBlur={editando ? buscarCEP : undefined} className={INPUT} />
              </div>
              {cepLoad && <span className="pb-2.5 text-xs text-zinc-400 shrink-0">Buscando...</span>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={LABEL}>Logradouro</label>
                <input type="text" value={form.logradouro} disabled={disabled} onChange={e => set("logradouro", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Número</label>
                <input type="text" value={form.numero_end} disabled={disabled} onChange={e => set("numero_end", e.target.value)} className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Complemento</label>
                <input type="text" value={form.complemento} disabled={disabled} onChange={e => set("complemento", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Bairro</label>
                <input type="text" value={form.bairro} disabled={disabled} onChange={e => set("bairro", e.target.value)} className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={LABEL}>Município</label>
                <input type="text" value={form.municipio} disabled={disabled} onChange={e => set("municipio", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>UF</label>
                {disabled ? (
                  <input type="text" value={form.uf} disabled className={INPUT} />
                ) : (
                  <select value={form.uf} onChange={e => set("uf", e.target.value)} className={SELECT}>
                    <option value="">UF</option>
                    {UF_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Contatos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Email</label>
                <input type="email" value={form.email} disabled={disabled} onChange={e => set("email", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Telefone</label>
                <input type="tel" value={form.telefone} disabled={disabled} onChange={e => set("telefone", formatTel(e.target.value))} className={INPUT} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 1: Dados Contratuais ── */}
      {tab === 1 && (
        <div className="space-y-5">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Vínculo Empregatício</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Data de Admissão</label>
                <input type="date" value={form.data_admissao} disabled={disabled} onChange={e => set("data_admissao", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Matrícula</label>
                <input type="text" value={form.matricula} disabled={disabled} onChange={e => set("matricula", e.target.value)} className={INPUT} />
              </div>
            </div>

            <div>
              <label className={LABEL}>Tipo de Contrato</label>
              {disabled ? (
                <input type="text" value={form.tipo_contrato === "determinado" ? "Determinado (Experiência)" : "Indeterminado"} disabled className={INPUT} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: "indeterminado", l: "Indeterminado" },
                    { v: "determinado",   l: "Determinado (Experiência)" },
                  ].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => set("tipo_contrato", v)}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        form.tipo_contrato === v
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      }`}
                    >{l}</button>
                  ))}
                </div>
              )}
            </div>

            {form.tipo_contrato === "determinado" && (
              <div>
                <label className={LABEL}>Data de Término</label>
                <input type="date" value={form.data_fim_contrato} disabled={disabled} onChange={e => set("data_fim_contrato", e.target.value)} className={INPUT} />
              </div>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Classificação e Função</h2>

            <div>
              <label className={LABEL}>Cargo (título interno)</label>
              <input type="text" value={form.cargo} disabled={disabled} onChange={e => set("cargo", e.target.value)} className={INPUT} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Código CBO</label>
                <input type="text" value={form.cbo} disabled={disabled} onChange={e => set("cbo", e.target.value.replace(/\D/g, "").slice(0, 6))} className={`${INPUT} font-mono`} />
              </div>
              <div>
                <label className={LABEL}>Descrição CBO</label>
                <input type="text" value={form.cbo_descricao} disabled={disabled} onChange={e => set("cbo_descricao", e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Jornada de Trabalho</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Horário de Entrada</label>
                <input type="time" value={form.horario_entrada} disabled={disabled} onChange={e => set("horario_entrada", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Horário de Saída</label>
                <input type="time" value={form.horario_saida} disabled={disabled} onChange={e => set("horario_saida", e.target.value)} className={INPUT} />
              </div>
            </div>

            <div>
              <label className={LABEL}>Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((d, i) => (
                  <button key={d} type="button"
                    onClick={() => editando && toggleDia(DIAS_VALUES[i])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.dias_trabalho.includes(DIAS_VALUES[i])
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "border-zinc-200 text-zinc-400"
                    } ${disabled ? "cursor-default" : "hover:border-zinc-400 cursor-pointer"}`}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Dados Remuneratórios ── */}
      {tab === 2 && (
        <div className="space-y-5">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Remuneração Base</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Salário Base (R$)</label>
                <input type="text" value={form.salario} disabled={disabled}
                  onChange={e => set("salario", e.target.value.replace(/[^0-9,.]/g, ""))}
                  className={`${INPUT} tabular-nums`}
                  placeholder={disabled && form.salario === "" ? (raw.salario != null ? fmt(raw.salario) : "—") : "0,00"}
                />
              </div>
              <div>
                <label className={LABEL}>Unidade de Pagamento</label>
                {disabled ? (
                  <input type="text" value={form.unidade_pagamento === "hora" ? "Por Hora" : form.unidade_pagamento === "dia" ? "Por Dia" : "Por Mês"} disabled className={INPUT} />
                ) : (
                  <select value={form.unidade_pagamento} onChange={e => set("unidade_pagamento", e.target.value)} className={SELECT}>
                    <option value="mes">Por Mês</option>
                    <option value="dia">Por Dia</option>
                    <option value="hora">Por Hora</option>
                  </select>
                )}
              </div>
            </div>

            {raw.salario != null && disabled && (
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-400">Remuneração registrada</p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5 tabular-nums">
                  {fmt(raw.salario)}<span className="text-sm font-normal text-zinc-400">{unid(raw.unidade_pagamento)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Adicionais (Art. 193 e 192 da CLT)</h2>

            <div className={`flex items-center justify-between p-3 rounded-lg border border-zinc-200 ${disabled ? "opacity-60" : ""}`}>
              <div>
                <p className="text-sm font-medium text-zinc-900">Adicional de Periculosidade</p>
                <p className="text-xs text-zinc-400 mt-0.5">30% sobre o salário base</p>
              </div>
              <button
                type="button"
                onClick={() => editando && set("adicional_periculosidade", !form.adicional_periculosidade)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${form.adicional_periculosidade ? "bg-zinc-900" : "bg-zinc-200"} ${disabled ? "cursor-default" : ""}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${form.adicional_periculosidade ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>

            <div>
              <label className={LABEL}>Adicional de Insalubridade</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "",       l: "Nenhum"       },
                  { v: "minimo", l: "Mínimo (10%)" },
                  { v: "medio",  l: "Médio (20%)"  },
                  { v: "maximo", l: "Máximo (40%)" },
                ].map(({ v, l }) => (
                  <button key={v} type="button"
                    onClick={() => editando && set("adicional_insalubridade", v)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.adicional_insalubridade === v
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "border-zinc-200 text-zinc-400"
                    } ${disabled ? "cursor-default" : "hover:border-zinc-500 cursor-pointer"}`}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <p className="text-xs text-zinc-500">
              Cadastrado em {fmtDate(raw.created_at.split("T")[0])}
              {raw.data_admissao && ` · Admissão: ${fmtDate(raw.data_admissao)}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Tab 3: Alterações Contratuais (S-2206) ── */}
      {tab === 3 && (
        <div className="space-y-4">
          {/* Aviso eSocial */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">eSocial S-2206 — Prazo</p>
            <p className="text-xs text-amber-700">
              Cada alteração deve ser enviada ao Domínio até o <strong>15º dia do mês subsequente</strong> à competência.
              O S-2206 precisa ser transmitido antes da folha de pagamento (S-1200 / S-1210) do mês da alteração.
            </p>
          </div>

          {loadingAlt ? (
            <div className="text-center py-12 text-zinc-400 text-sm">Carregando histórico...</div>
          ) : alteracoes.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
              <p className="text-zinc-400 text-sm">Nenhuma alteração contratual registrada.</p>
              <p className="text-zinc-300 text-xs mt-1">Use o botão "Registrar Alteração" para criar o primeiro evento S-2206.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alteracoes.map(alt => {
                const prazoVencido = new Date(alt.prazo_esocial + "T00:00:00") < new Date() && alt.status_esocial === "pendente";
                return (
                  <div key={alt.id} className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-900">
                            {TIPO_EVENTO_LABEL[alt.tipo_evento] ?? alt.tipo_evento}
                          </span>
                          {alt.motivo && (
                            <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                              {MOTIVO_LABEL[alt.motivo] ?? alt.motivo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Vigência: {fmtDate(alt.data_alteracao)} · Competência: {alt.competencia}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_ESOCIAL_STYLE[alt.status_esocial] ?? "bg-zinc-100 text-zinc-500"}`}>
                        {alt.status_esocial.charAt(0).toUpperCase() + alt.status_esocial.slice(1)}
                      </span>
                    </div>

                    {/* Diff de/para */}
                    <div className="bg-zinc-50 rounded-lg px-4 py-3 space-y-1.5">
                      {Object.keys(alt.campos_alterados.para).map(key => {
                        const antes  = alt.campos_alterados.de[key];
                        const depois = alt.campos_alterados.para[key];
                        const antesStr  = antes  == null || antes  === "" ? "—" : String(antes);
                        const depoisStr = depois == null || depois === "" ? "—" : String(depois);
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400 w-32 shrink-0">{key}</span>
                            <span className="text-zinc-500 line-through tabular-nums">{antesStr}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400 shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            <span className="font-medium text-zinc-900 tabular-nums">{depoisStr}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                      <div>
                        <p className={`text-xs ${prazoVencido ? "text-red-600 font-medium" : "text-zinc-400"}`}>
                          Prazo eSocial: {fmtDate(alt.prazo_esocial)}{prazoVencido ? " — VENCIDO" : ""}
                        </p>
                        {alt.protocolo_dominio && (
                          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                            Protocolo: {alt.protocolo_dominio}
                          </p>
                        )}
                        {alt.observacoes && (
                          <p className="text-xs text-zinc-400 italic mt-0.5">{alt.observacoes}</p>
                        )}
                      </div>
                      {alt.status_esocial === "pendente" && (
                        <button
                          onClick={() => enviarAoDominio(alt.id)}
                          disabled={enviandoId === alt.id}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                          {enviandoId === alt.id ? "Enviando..." : "Enviar ao Domínio"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Registrar Alteração Contratual ── */}
      {modalAlt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Registrar Alteração Contratual</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Evento eSocial S-2206</p>
              </div>
              <button onClick={() => setModalAlt(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {erroAlt && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erroAlt}</div>
              )}

              {/* Tipo de evento */}
              <div>
                <label className={LABEL}>Tipo de Alteração <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { v: "alteracao_salario",       l: "Alteração Salarial",             d: "Reajuste, dissídio, promoção" },
                    { v: "mudanca_cargo",            l: "Mudança de Cargo / CBO",         d: "Novo cargo ou código CBO"     },
                    { v: "alteracao_jornada",        l: "Alteração de Jornada",           d: "Horários e dias de trabalho"  },
                    { v: "alteracao_tipo_contrato",  l: "Tipo de Contrato",               d: "Determinado / Indeterminado"  },
                  ].map(({ v, l, d }) => (
                    <button key={v} type="button" onClick={() => setAlt("tipo_evento", v)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                        altForm.tipo_evento === v
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{l}</p>
                        <p className={`text-xs mt-0.5 ${altForm.tipo_evento === v ? "text-zinc-300" : "text-zinc-400"}`}>{d}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos dependentes do tipo */}
              {altForm.tipo_evento === "alteracao_salario" && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Motivo</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: "reajuste",      l: "Reajuste"      },
                        { v: "dissidio",      l: "Dissídio"      },
                        { v: "promocao",      l: "Promoção"      },
                        { v: "enquadramento", l: "Enquadramento" },
                      ].map(({ v, l }) => (
                        <button key={v} type="button" onClick={() => setAlt("motivo", v)}
                          className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                            altForm.motivo === v
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                          }`}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Novo Salário Base (R$) <span className="text-red-500">*</span></label>
                      <input type="text" value={altForm.salario}
                        onChange={e => setAlt("salario", e.target.value.replace(/[^0-9,.]/g, ""))}
                        placeholder="0,00" className={`${INPUT} tabular-nums`} />
                    </div>
                    <div>
                      <label className={LABEL}>Unidade</label>
                      <select value={altForm.unidade_pagamento} onChange={e => setAlt("unidade_pagamento", e.target.value)} className={SELECT}>
                        <option value="mes">Por Mês</option>
                        <option value="dia">Por Dia</option>
                        <option value="hora">Por Hora</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {altForm.tipo_evento === "mudanca_cargo" && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Novo Cargo (título interno)</label>
                    <input type="text" value={altForm.cargo} onChange={e => setAlt("cargo", e.target.value)} className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Novo Código CBO</label>
                      <input type="text" value={altForm.cbo}
                        onChange={e => setAlt("cbo", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className={`${INPUT} font-mono`} />
                    </div>
                    <div>
                      <label className={LABEL}>Descrição CBO</label>
                      <input type="text" value={altForm.cbo_descricao} onChange={e => setAlt("cbo_descricao", e.target.value)} className={INPUT} />
                    </div>
                  </div>
                </div>
              )}

              {altForm.tipo_evento === "alteracao_jornada" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Novo Horário de Entrada</label>
                      <input type="time" value={altForm.horario_entrada} onChange={e => setAlt("horario_entrada", e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Novo Horário de Saída</label>
                      <input type="time" value={altForm.horario_saida} onChange={e => setAlt("horario_saida", e.target.value)} className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Novos Dias da Semana</label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS.map((d, i) => (
                        <button key={d} type="button" onClick={() => toggleDiaAlt(DIAS_VALUES[i])}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                            altForm.dias_trabalho.includes(DIAS_VALUES[i])
                              ? "bg-zinc-900 text-white border-zinc-900"
                              : "border-zinc-200 text-zinc-400 hover:border-zinc-400"
                          }`}
                        >{d}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {altForm.tipo_evento === "alteracao_tipo_contrato" && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Novo Tipo de Contrato</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "indeterminado", l: "Indeterminado"            },
                        { v: "determinado",   l: "Determinado (Experiência)" },
                      ].map(({ v, l }) => (
                        <button key={v} type="button" onClick={() => setAlt("tipo_contrato", v)}
                          className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                            altForm.tipo_contrato === v
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                          }`}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                  {altForm.tipo_contrato === "determinado" && (
                    <div>
                      <label className={LABEL}>Nova Data de Término</label>
                      <input type="date" value={altForm.data_fim_contrato} onChange={e => setAlt("data_fim_contrato", e.target.value)} className={INPUT} />
                    </div>
                  )}
                </div>
              )}

              {/* Datas obrigatórias — sempre visíveis após escolher tipo */}
              {altForm.tipo_evento && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                  <div>
                    <label className={LABEL}>Data da Alteração <span className="text-red-500">*</span></label>
                    <input type="date" value={altForm.data_alteracao} onChange={e => setAlt("data_alteracao", e.target.value)} className={INPUT} />
                    <p className="text-xs text-zinc-400 mt-1">Dia em que a mudança entrou em vigor</p>
                  </div>
                  <div>
                    <label className={LABEL}>Competência <span className="text-red-500">*</span></label>
                    <input type="month" value={altForm.competencia} onChange={e => setAlt("competencia", e.target.value)} className={INPUT} />
                    <p className="text-xs text-zinc-400 mt-1">Mês/ano da folha afetada</p>
                  </div>
                </div>
              )}

              {altForm.tipo_evento && (
                <div>
                  <label className={LABEL}>Observações</label>
                  <textarea value={altForm.observacoes} onChange={e => setAlt("observacoes", e.target.value)}
                    rows={2} placeholder="Informações adicionais (opcional)"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
              <button onClick={() => setModalAlt(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:border-zinc-400 transition-colors">
                Cancelar
              </button>
              <button onClick={registrarAlteracao} disabled={savingAlt || !altForm.tipo_evento}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                {savingAlt ? "Registrando..." : "Registrar Alteração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
