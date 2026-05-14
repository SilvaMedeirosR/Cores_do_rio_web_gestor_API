"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_DEP_PESS ?? "";
// v2

interface Funcionario {
  id: string;
  nome: string;
  cpf: string | null;
  nis: string | null;
  matricula: string | null;
  cargo: string | null;
  cbo_descricao: string | null;
  salario: number | null;
  unidade_pagamento: string | null;
  status: string;
  data_admissao: string | null;
}

const fmt     = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
const unid    = (u: string | null) => u === "hora" ? "/h" : u === "dia" ? "/dia" : "/mês";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

export default function DepartamentoPessoalPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [busca, setBusca]               = useState("");
  const [loading, setLoading]           = useState(true);
  const [erro, setErro]                 = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/funcionarios`)
      .then(r => r.json())
      .then(j => { setFuncionarios(j.data ?? []); setLoading(false); })
      .catch(() => { setErro("Erro ao carregar funcionários."); setLoading(false); });
  }, []);

  const lista = busca
    ? funcionarios.filter(f =>
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (f.cpf ?? "").includes(busca) ||
        (f.matricula ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : funcionarios;

  const ativos = funcionarios.filter(f => f.status === "ativo").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Departamento Pessoal</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {loading ? "Carregando..." : `${ativos} funcionário${ativos !== 1 ? "s" : ""} ativo${ativos !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/departamento-pessoal/funcionarios/novo"
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Funcionário
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou matrícula..."
          className={INPUT}
        />
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{erro}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-sm">{busca ? "Nenhum funcionário encontrado." : "Nenhum funcionário cadastrado ainda."}</p>
          {!busca && (
            <Link href="/departamento-pessoal/funcionarios/novo" className="inline-block mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium">
              Cadastrar primeiro funcionário →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Matrícula</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">CPF</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Função / CBO</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Admissão</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Salário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lista.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/departamento-pessoal/funcionarios/${f.id}`} className="font-medium text-zinc-900 group-hover:text-orange-600 transition-colors">
                        {f.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{f.matricula ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{f.cpf ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{f.cbo_descricao ?? f.cargo ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">{f.data_admissao ? fmtDate(f.data_admissao) : "—"}</td>
                    <td className="px-4 py-3 text-zinc-700 font-medium tabular-nums">
                      {f.salario != null ? `${fmt(f.salario)}${unid(f.unidade_pagamento)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === "ativo" ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"
                      }`}>
                        {f.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {lista.map(f => (
              <Link
                key={f.id}
                href={`/departamento-pessoal/funcionarios/${f.id}`}
                className="block bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <p className="font-semibold text-zinc-900 text-sm">{f.nome}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.status === "ativo" ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {f.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{f.cbo_descricao ?? f.cargo ?? "—"}</p>
                <div className="flex gap-3 mt-1.5 text-xs text-zinc-400">
                  {f.matricula && <span>Mat. {f.matricula}</span>}
                  {f.data_admissao && <span>Admissão: {fmtDate(f.data_admissao)}</span>}
                </div>
                {f.salario != null && (
                  <p className="text-sm text-zinc-700 font-medium mt-1.5">{fmt(f.salario)}{unid(f.unidade_pagamento)}</p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
