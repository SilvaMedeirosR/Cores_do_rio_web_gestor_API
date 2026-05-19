"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePagination } from "@/lib/hooks/usePagination";
import Pagination from "@/components/Pagination";

const API = process.env.NEXT_PUBLIC_API_DEP_PESS ?? "";

interface PontotelFuncionario {
  id:            string;
  nome:          string;
  cpf:           string | null;
  matricula:     string | null;
  cargo:         string | null;
  departamento:  string | null;
  email:         string | null;
  status:        string;
  data_admissao: string | null;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

export default function PontotelPage() {
  const [funcionarios, setFuncionarios] = useState<PontotelFuncionario[]>([]);
  const [busca, setBusca]               = useState("");
  const [loading, setLoading]           = useState(true);
  const [erro, setErro]                 = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/pontotel/funcionarios`)
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error);
        setFuncionarios(j.data ?? []);
      })
      .catch(e => setErro(e.message ?? "Erro ao conectar ao PontoTel."))
      .finally(() => setLoading(false));
  }, []);

  const lista = busca.trim()
    ? funcionarios.filter(f =>
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (f.matricula ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        (f.departamento ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        (f.cargo ?? "").toLowerCase().includes(busca.toLowerCase())
      )
    : funcionarios;

  const ativos   = funcionarios.filter(f => f.status === "ativo").length;
  const inativos = funcionarios.filter(f => f.status !== "ativo").length;
  const pag      = usePagination(lista);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
        <Link href="/departamento-pessoal" className="hover:text-zinc-600 transition-colors">
          Departamento Pessoal
        </Link>
        <span>/</span>
        <span className="text-zinc-600 font-medium">PontoTel</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              PontoTel
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              Dados externos
            </span>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            {loading
              ? "Consultando PontoTel..."
              : erro
                ? "Falha na conexão"
                : `${ativos} ativo${ativos !== 1 ? "s" : ""} · ${inativos} inativo${inativos !== 1 ? "s" : ""} · ${funcionarios.length} total`}
          </p>
        </div>
        <Link
          href="/departamento-pessoal"
          className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors flex items-center gap-1.5 shrink-0"
        >
          ← Voltar
        </Link>
      </div>

      {/* Busca */}
      {!loading && !erro && funcionarios.length > 0 && (
        <div className="mb-5">
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, matrícula, cargo ou departamento..."
            className={INPUT}
          />
        </div>
      )}

      {/* Estado: carregando */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">
          Consultando PontoTel...
        </div>
      )}

      {/* Estado: erro */}
      {!loading && erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-6 text-center">
          <p className="text-red-700 font-medium text-sm mb-1">Não foi possível conectar ao PontoTel</p>
          <p className="text-red-500 text-xs">{erro}</p>
        </div>
      )}

      {/* Estado: vazio */}
      {!loading && !erro && lista.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-sm">{busca ? "Nenhum funcionário encontrado para essa busca." : "Nenhum funcionário retornado pelo PontoTel."}</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && !erro && lista.length > 0 && (
        <>
          <div key={pag.animKey} className={`hidden sm:block overflow-x-auto rounded-xl border border-zinc-200 shadow-sm ${pag.animClass}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  {["Nome","Matrícula","Cargo","Departamento","Admissão","CPF","Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {pag.pageItems.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{f.nome}</p>
                      {f.email && <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">{f.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs whitespace-nowrap">{f.matricula ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{f.cargo ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{f.departamento ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtDate(f.data_admissao)}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs whitespace-nowrap">{f.cpf ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${f.status === "ativo" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        {f.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div key={`m-${pag.animKey}`} className={`sm:hidden space-y-3 ${pag.animClass}`}>
            {pag.pageItems.map(f => (
              <div key={f.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div style={{ minWidth: 0 }}>
                    <p className="font-semibold text-zinc-900 text-sm" style={{ overflowWrap: "break-word" }}>{f.nome}</p>
                    {f.email && <p className="text-xs text-zinc-400 mt-0.5 truncate">{f.email}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${
                    f.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {f.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500 mt-1">
                  {f.matricula     && <span>Mat. {f.matricula}</span>}
                  {f.cargo         && <span className="truncate">{f.cargo}</span>}
                  {f.departamento  && <span className="truncate">{f.departamento}</span>}
                  {f.data_admissao && <span>Adm. {fmtDate(f.data_admissao)}</span>}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={pag.page} totalPages={pag.totalPages}
            from={pag.from} to={pag.to} total={pag.total}
            onPrev={pag.goPrev} onNext={pag.goNext}
          />
        </>
      )}
    </div>
  );
}
