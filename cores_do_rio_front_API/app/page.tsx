"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { temAcesso, type Funcao } from "@/lib/auth/permissions";

/* ── Ícones ── */
const IconOrcamento = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconCompras = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconPessoal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconFinanceiro = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const IconMetricas = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const MODULES = [
  { label: "Orçamentos",    href: "/orcamentos",           api: process.env.NEXT_PUBLIC_API_ORCAMENTO,  desc: "Contratos e orçamentos de obras",             icon: <IconOrcamento />   },
  { label: "Compras",       href: "/compras",              api: process.env.NEXT_PUBLIC_API_COMPRAS,    desc: "Pedidos de materiais e ordens de compra",     icon: <IconCompras />     },
  { label: "Dep. Pessoal",  href: "/departamento-pessoal", api: process.env.NEXT_PUBLIC_API_DEP_PESS,   desc: "Funcionários e folha de pagamento",           icon: <IconPessoal />     },
  { label: "Financeiro",    href: "/financeiro",           api: process.env.NEXT_PUBLIC_API_FINANCEIRO, desc: "Lançamentos e fluxo de caixa",                icon: <IconFinanceiro />  },
  { label: "Métricas",      href: "/metricas",             api: undefined,                              desc: "Indicadores e acompanhamento de resultados",  icon: <IconMetricas />    },
];

type StatusMap = Record<string, "checking" | "online" | "offline">;

export default function Home() {
  const [statuses, setStatuses] = useState<StatusMap>(
    Object.fromEntries(MODULES.map(m => [m.label, "checking"]))
  );
  const [funcao, setFuncao] = useState<Funcao | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const f = data.user?.user_metadata?.funcao as Funcao | undefined;
      if (f) setFuncao(f);
    });
  }, []);

  const modulosVisiveis = funcao
    ? MODULES.filter(m => temAcesso(funcao, m.href))
    : [];

  useEffect(() => {
    MODULES.forEach(async ({ label, api }) => {
      if (!api) { setStatuses(s => ({ ...s, [label]: "offline" })); return; }
      try {
        const r = await fetch(`${api}/health`);
        setStatuses(s => ({ ...s, [label]: r.ok ? "online" : "offline" }));
      } catch {
        setStatuses(s => ({ ...s, [label]: "offline" }));
      }
    });
  }, []);

  const onlineCount = modulosVisiveis.filter(m => statuses[m.label] === "online").length;
  const totalComApi = modulosVisiveis.filter(m => m.api).length;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem)" }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: "clamp(1.5rem, 4vw, 2.5rem)" }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 400,
          color: "#1A2A3A",
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
          marginBottom: "8px",
        }}>
          Bem-vindo
        </h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)", letterSpacing: "0.03em" }}>
          {!funcao
            ? "Carregando..."
            : onlineCount === totalComApi
            ? `${totalComApi} módulo${totalComApi !== 1 ? "s" : ""} online`
            : `${onlineCount} de ${totalComApi} módulos online`}
        </p>
      </div>

      {/* Grid de módulos */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: "clamp(0.75rem, 2vw, 1rem)",
      }}>
        {modulosVisiveis.map(({ label, href, desc, icon }) => {
          const status = statuses[label];
          return (
            <Link key={label} href={href} style={{
              position: "relative",
              display: "block",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(26,42,58,0.10)",
              borderRadius: "14px",
              padding: "clamp(1rem, 3vw, 1.5rem)",
              overflow: "hidden",
              textDecoration: "none",
              transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.25)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(26,42,58,0.09)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.10)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Letra decorativa de fundo */}
              <span style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "6rem",
                fontFamily: "var(--font-cormorant)",
                fontWeight: 700,
                color: "rgba(26,42,58,0.04)",
                lineHeight: 1,
                userSelect: "none",
                pointerEvents: "none",
              }}>
                {label.charAt(0)}
              </span>

              {/* Topo: status dot + ícone */}
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "clamp(1.5rem, 4vw, 2.5rem)" }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%", marginTop: "2px", flexShrink: 0,
                  backgroundColor:
                    status === "online"   ? "#4ade80" :
                    status === "offline"  ? "#f87171" : "rgba(26,42,58,0.2)",
                }} />
                <span style={{ color: "rgba(26,42,58,0.35)", transition: "color 0.2s" }}>
                  {icon}
                </span>
              </div>

              {/* Label + descrição */}
              <div style={{ position: "relative" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1A2A3A", marginBottom: "3px" }}>{label}</p>
                <p style={{ fontSize: "0.75rem", color: "rgba(26,42,58,0.45)", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
