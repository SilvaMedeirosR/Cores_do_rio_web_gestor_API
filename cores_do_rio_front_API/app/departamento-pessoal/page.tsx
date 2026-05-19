"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Clock, Plus, Users } from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";
import Pagination from "@/components/Pagination";

const API = process.env.NEXT_PUBLIC_API_DEP_PESS ?? "";

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
  const pag    = usePagination(lista);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(1.5rem,4vw,3rem) clamp(1rem,3vw,2rem)" }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "clamp(1.5rem,3vw,2rem)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "6px" }}>
            Departamento Pessoal
          </h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={12} />
            {loading ? "Carregando..." : `${ativos} funcionário${ativos !== 1 ? "s" : ""} ativo${ativos !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/departamento-pessoal/pontotel"
            style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "8px", border: "1px solid rgba(26,42,58,0.14)", backgroundColor: "#fff", color: "#1A2A3A", textDecoration: "none", fontSize: "0.8rem", fontWeight: 500, transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(26,42,58,0.30)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(26,42,58,0.14)"; }}
          >
            <Clock size={13} strokeWidth={2} />
            PontoTel
          </Link>
          <Link href="/departamento-pessoal/funcionarios/novo"
            className="cr-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "8px", backgroundColor: "#1A2A3A", color: "#F3ECE0", textDecoration: "none", fontSize: "0.8rem", fontWeight: 500, border: "none" }}
          >
            <Plus size={13} strokeWidth={2.5} />
            Novo Funcionário
          </Link>
        </div>
      </div>

      {/* Busca */}
      <div style={{ position: "relative", marginBottom: "clamp(1rem,2vw,1.5rem)" }}>
        <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(26,42,58,0.35)", pointerEvents: "none" }} />
        <input type="search" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou matrícula..."
          style={{ width: "100%", padding: "11px 16px 11px 38px", borderRadius: "8px", fontSize: "0.875rem", backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.14)", color: "#1A2A3A", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
          onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
          onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
        />
      </div>

      {erro && (
        <div style={{ padding: "12px 16px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.8rem", color: "#dc2626" }}>{erro}</div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0", fontSize: "0.85rem", color: "rgba(26,42,58,0.4)" }}>Carregando...</div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(26,42,58,0.4)" }}>
          <p style={{ fontSize: "0.875rem" }}>{busca ? "Nenhum funcionário encontrado." : "Nenhum funcionário cadastrado ainda."}</p>
          {!busca && (
            <Link href="/departamento-pessoal/funcionarios/novo"
              style={{ display: "inline-block", marginTop: "16px", fontSize: "0.8rem", color: "#1A2A3A", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Cadastrar primeiro funcionário →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div key={pag.animKey} className={`show-desktop ${pag.animClass}`}
            style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(26,42,58,0.10)" }}>
            <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse", display: "table" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(26,42,58,0.03)", borderBottom: "1px solid rgba(26,42,58,0.08)" }}>
                  {["Nome","Matrícula","CPF","Função / CBO","Admissão","Salário","Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: "0.65rem", fontWeight: 600, color: "rgba(26,42,58,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pag.pageItems.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: i < pag.pageItems.length - 1 ? "1px solid rgba(26,42,58,0.06)" : "none", backgroundColor: "#fff", transition: "background-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(26,42,58,0.02)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/departamento-pessoal/funcionarios/${f.id}`}
                        style={{ fontWeight: 600, color: "#1A2A3A", textDecoration: "none", transition: "opacity 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.65"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                      >{f.nome}</Link>
                    </td>
                    <td style={{ padding: "12px 16px", color: "rgba(26,42,58,0.55)" }}>{f.matricula ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(26,42,58,0.55)", fontFamily: "monospace", fontSize: "0.8rem" }}>{f.cpf ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(26,42,58,0.7)" }}>{f.cbo_descricao ?? f.cargo ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(26,42,58,0.55)", whiteSpace: "nowrap" }}>{f.data_admissao ? fmtDate(f.data_admissao) : "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#1A2A3A", fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {f.salario != null ? `${fmt(f.salario)}${unid(f.unidade_pagamento)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 500, backgroundColor: f.status === "ativo" ? "rgba(34,197,94,0.1)" : "rgba(26,42,58,0.06)", color: f.status === "ativo" ? "#16a34a" : "rgba(26,42,58,0.5)" }}>
                        {f.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div key={`m-${pag.animKey}`} className={`show-mobile ${pag.animClass}`} style={{ marginTop: "8px" }}>
            {pag.pageItems.map(f => (
              <Link key={f.id} href={`/departamento-pessoal/funcionarios/${f.id}`}
                style={{ display: "block", backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "12px", padding: "16px", marginBottom: "10px", textDecoration: "none", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.25)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.10)"}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" }}>
                  <p style={{ fontWeight: 600, color: "#1A2A3A", fontSize: "0.875rem", flex: 1, marginRight: "8px", overflowWrap: "break-word" }}>{f.nome}</p>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 500, flexShrink: 0, backgroundColor: f.status === "ativo" ? "rgba(34,197,94,0.1)" : "rgba(26,42,58,0.06)", color: f.status === "ativo" ? "#16a34a" : "rgba(26,42,58,0.5)" }}>
                    {f.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "rgba(26,42,58,0.55)" }}>{f.cbo_descricao ?? f.cargo ?? "—"}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px", fontSize: "0.7rem", color: "rgba(26,42,58,0.4)" }}>
                  {f.matricula && <span>Mat. {f.matricula}</span>}
                  {f.data_admissao && <span>Adm: {fmtDate(f.data_admissao)}</span>}
                </div>
                {f.salario != null && (
                  <p style={{ fontSize: "0.875rem", color: "#1A2A3A", fontWeight: 500, marginTop: "6px" }}>{fmt(f.salario)}{unid(f.unidade_pagamento)}</p>
                )}
              </Link>
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
