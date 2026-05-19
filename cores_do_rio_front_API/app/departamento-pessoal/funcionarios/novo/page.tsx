"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toastSuccess, toastError } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_DEP_PESS ?? "";

const INPUT  = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const SELECT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow appearance-none";
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

const emptyForm = () => ({
  nome: "", cpf: "", nis: "", data_nascimento: "",
  cep: "", logradouro: "", numero_end: "", complemento: "", bairro: "", municipio: "", uf: "",
  email: "", telefone: "", escolaridade: "",
  cargo: "", matricula: "", cbo: "", cbo_descricao: "",
  tipo_contrato: "indeterminado", data_admissao: "", data_fim_contrato: "",
  horario_entrada: "", horario_saida: "", dias_trabalho: [] as string[],
  salario: "", unidade_pagamento: "mes",
  adicional_periculosidade: false, adicional_insalubridade: "",
});

type Form = ReturnType<typeof emptyForm>;

const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const formatNIS = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 8) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0,3)}.${d.slice(3,8)}.${d.slice(8)}`;
  return `${d.slice(0,3)}.${d.slice(3,8)}.${d.slice(8,10)}-${d.slice(10)}`;
};

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

const TABS = ["Dados Cadastrais", "Dados Contratuais", "Dados Remuneratórios"];

export default function NovoFuncionarioPage() {
  const router = useRouter();
  const [tab, setTab]           = useState(0);
  const [form, setForm]         = useState<Form>(emptyForm());
  const [loading, setLoading]   = useState(false);
  const [cepLoad, setCepLoad]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));

  const buscarCEP = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoad(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(p => ({
          ...p,
          logradouro: d.logradouro || p.logradouro,
          bairro:     d.bairro     || p.bairro,
          municipio:  d.localidade || p.municipio,
          uf:         d.uf         || p.uf,
        }));
      }
    } finally {
      setCepLoad(false);
    }
  };

  const toggleDia = (v: string) =>
    setForm(p => ({
      ...p,
      dias_trabalho: p.dias_trabalho.includes(v)
        ? p.dias_trabalho.filter(d => d !== v)
        : [...p.dias_trabalho, v],
    }));

  const handleSubmit = async () => {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); setTab(0); return; }
    setErro(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        dias_trabalho:     form.dias_trabalho.join(",") || null,
        salario:           form.salario ? parseFloat(form.salario.replace(",", ".")) : null,
        cpf:               form.cpf.replace(/\D/g, "")  || null,
        nis:               form.nis.replace(/\D/g, "")  || null,
        telefone:          form.telefone || null,
        data_fim_contrato: form.tipo_contrato === "determinado" ? form.data_fim_contrato || null : null,
        adicional_insalubridade: form.adicional_insalubridade || null,
      };
      const r = await fetch(`${API}/funcionarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) { toastError(j.error ?? "Erro ao cadastrar."); setErro(j.error ?? "Erro ao cadastrar."); setLoading(false); return; }
      toastSuccess("Funcionário cadastrado com sucesso!");
      router.push(`/departamento-pessoal/funcionarios/${j.data.id}`);
    } catch {
      setErro("Erro de conexão com a API.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      <div className="flex items-center gap-3 mb-8">
        <Link href="/departamento-pessoal" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Novo Funcionário</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Preencha os dados nas 3 etapas</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-zinc-200 mb-8 overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
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

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{erro}</div>
      )}

      {/* ── Tab 0: Dados Cadastrais ── */}
      {tab === 0 && (
        <div className="space-y-5">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Identificação</h2>

            <div>
              <label className={LABEL}>Nome Completo <span className="text-red-500">*</span></label>
              <input type="text" value={form.nome} onChange={e => set("nome", e.target.value)} className={INPUT} placeholder="Nome completo conforme RG/CPF" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>CPF</label>
                <input type="text" value={form.cpf} onChange={e => set("cpf", formatCPF(e.target.value))} className={INPUT} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className={LABEL}>NIS / PIS / PASEP</label>
                <input type="text" value={form.nis} onChange={e => set("nis", formatNIS(e.target.value))} className={INPUT} placeholder="000.00000.00-0" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Data de Nascimento</label>
                <input type="date" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Escolaridade</label>
                <select value={form.escolaridade} onChange={e => set("escolaridade", e.target.value)} className={SELECT}>
                  <option value="">Selecione...</option>
                  {ESCOLARIDADE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Endereço</h2>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={LABEL}>CEP</label>
                <input type="text" value={form.cep} onChange={e => set("cep", formatCEP(e.target.value))} onBlur={buscarCEP} className={INPUT} placeholder="00000-000" />
              </div>
              {cepLoad && <span className="pb-2.5 text-xs text-zinc-400 shrink-0">Buscando...</span>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={LABEL}>Logradouro</label>
                <input type="text" value={form.logradouro} onChange={e => set("logradouro", e.target.value)} className={INPUT} placeholder="Rua, Avenida..." />
              </div>
              <div>
                <label className={LABEL}>Número</label>
                <input type="text" value={form.numero_end} onChange={e => set("numero_end", e.target.value)} className={INPUT} placeholder="123" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Complemento</label>
                <input type="text" value={form.complemento} onChange={e => set("complemento", e.target.value)} className={INPUT} placeholder="Apto, Bloco..." />
              </div>
              <div>
                <label className={LABEL}>Bairro</label>
                <input type="text" value={form.bairro} onChange={e => set("bairro", e.target.value)} className={INPUT} placeholder="Bairro" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={LABEL}>Município</label>
                <input type="text" value={form.municipio} onChange={e => set("municipio", e.target.value)} className={INPUT} placeholder="Município" />
              </div>
              <div>
                <label className={LABEL}>UF</label>
                <select value={form.uf} onChange={e => set("uf", e.target.value)} className={SELECT}>
                  <option value="">UF</option>
                  {UF_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Contatos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={INPUT} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className={LABEL}>Telefone</label>
                <input type="tel" value={form.telefone} onChange={e => set("telefone", formatTel(e.target.value))} className={INPUT} placeholder="(21) 99999-0000" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setTab(1)} className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Próximo →
            </button>
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
                <input type="date" value={form.data_admissao} onChange={e => set("data_admissao", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Matrícula</label>
                <input type="text" value={form.matricula} onChange={e => set("matricula", e.target.value)} className={INPUT} placeholder="EMP-001" />
              </div>
            </div>

            <div>
              <label className={LABEL}>Tipo de Contrato</label>
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
            </div>

            {form.tipo_contrato === "determinado" && (
              <div>
                <label className={LABEL}>Data de Término do Contrato</label>
                <input type="date" value={form.data_fim_contrato} onChange={e => set("data_fim_contrato", e.target.value)} className={INPUT} />
              </div>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Classificação e Função</h2>

            <div>
              <label className={LABEL}>Cargo (título interno)</label>
              <input type="text" value={form.cargo} onChange={e => set("cargo", e.target.value)} className={INPUT} placeholder="Ex: Pedreiro Sênior, Mestre de Obras..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Código CBO</label>
                <input type="text" value={form.cbo} onChange={e => set("cbo", e.target.value.replace(/\D/g, "").slice(0, 6))} className={INPUT} placeholder="710110" />
              </div>
              <div>
                <label className={LABEL}>Descrição CBO</label>
                <input type="text" value={form.cbo_descricao} onChange={e => set("cbo_descricao", e.target.value)} className={INPUT} placeholder="Pedreiro" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Jornada de Trabalho</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Horário de Entrada</label>
                <input type="time" value={form.horario_entrada} onChange={e => set("horario_entrada", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Horário de Saída</label>
                <input type="time" value={form.horario_saida} onChange={e => set("horario_saida", e.target.value)} className={INPUT} />
              </div>
            </div>

            <div>
              <label className={LABEL}>Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleDia(DIAS_VALUES[i])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.dias_trabalho.includes(DIAS_VALUES[i])
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setTab(0)} className="text-zinc-500 hover:text-zinc-800 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              ← Anterior
            </button>
            <button onClick={() => setTab(2)} className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Próximo →
            </button>
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
                <input
                  type="text"
                  value={form.salario}
                  onChange={e => set("salario", e.target.value.replace(/[^0-9,.]/g, ""))}
                  className={INPUT}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className={LABEL}>Unidade de Pagamento</label>
                <select value={form.unidade_pagamento} onChange={e => set("unidade_pagamento", e.target.value)} className={SELECT}>
                  <option value="mes">Por Mês</option>
                  <option value="dia">Por Dia</option>
                  <option value="hora">Por Hora</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Adicionais (Art. 193 e 192 da CLT)</h2>

            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200">
              <div>
                <p className="text-sm font-medium text-zinc-900">Adicional de Periculosidade</p>
                <p className="text-xs text-zinc-400 mt-0.5">30% sobre o salário base (Art. 193 CLT)</p>
              </div>
              <button
                type="button"
                onClick={() => set("adicional_periculosidade", !form.adicional_periculosidade)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${form.adicional_periculosidade ? "bg-zinc-900" : "bg-zinc-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-all ${form.adicional_periculosidade ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>

            <div>
              <label className={LABEL}>Adicional de Insalubridade (Art. 192 CLT)</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "",       l: "Nenhum"       },
                  { v: "minimo", l: "Mínimo (10%)" },
                  { v: "medio",  l: "Médio (20%)"  },
                  { v: "maximo", l: "Máximo (40%)" },
                ].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => set("adicional_insalubridade", v)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.adicional_insalubridade === v
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setTab(1)} className="text-zinc-500 hover:text-zinc-800 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              ← Anterior
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Cadastrando..." : "Cadastrar Funcionário"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
