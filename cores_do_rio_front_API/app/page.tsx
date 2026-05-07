"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const CartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const PeopleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const MoneyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const MODULES = [
  { label: "Orcamentos",   href: "/orcamentos",            api: process.env.NEXT_PUBLIC_API_ORCAMENTO,  desc: "Gestao de arquivos de contratos e orcamentos",     icon: <FolderIcon /> },
  { label: "Compras",      href: "/compras",               api: process.env.NEXT_PUBLIC_API_COMPRAS,    desc: "Pedidos de materiais e ordens de compra",          icon: <CartIcon />   },
  { label: "Dep. Pessoal", href: "/departamento-pessoal",  api: process.env.NEXT_PUBLIC_API_DEP_PESS,   desc: "Registro de funcionarios e folha de pagamento",    icon: <PeopleIcon /> },
  { label: "Financeiro",   href: "/financeiro",            api: process.env.NEXT_PUBLIC_API_FINANCEIRO, desc: "Controle de lancamentos e fluxos de caixa",        icon: <MoneyIcon />  },
  { label: "Metricas",     href: "/metricas",              api: undefined,                              desc: "Acompanhamento de indicadores e resultados",       icon: <ChartIcon />  },
];

type StatusMap = Record<string, "checking" | "online" | "offline">;

export default function Home() {
  const [statuses, setStatuses] = useState<StatusMap>(
    Object.fromEntries(MODULES.map((m) => [m.label, "checking"]))
  );

  useEffect(() => {
    MODULES.forEach(async ({ label, api }) => {
      if (!api) { setStatuses((s) => ({ ...s, [label]: "offline" })); return; }
      try {
        const r = await fetch(`${api}/health`);
        setStatuses((s) => ({ ...s, [label]: r.ok ? "online" : "offline" }));
      } catch {
        setStatuses((s) => ({ ...s, [label]: "offline" }));
      }
    });
  }, []);

  const onlineCount = Object.values(statuses).filter((s) => s === "online").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      <div className="mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">Bem-vindo!</h1>
        <p className="text-zinc-400 mt-1.5 text-sm">
          {onlineCount === MODULES.filter(m => m.api).length
            ? "Todos os modulos online"
            : `${onlineCount} de ${MODULES.filter(m => m.api).length} modulos online`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(({ label, href, desc, icon }) => {
          const status = statuses[label];
          return (
            <Link
              key={label}
              href={href}
              className="relative bg-white border border-zinc-200 rounded-xl p-6 overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all group"
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7rem] font-black text-zinc-100 leading-none select-none pointer-events-none">
                {label.charAt(0)}
              </span>

              <div className="relative flex items-start justify-between mb-10">
                <div className={`w-2 h-2 rounded-full mt-1 ${
                  status === "online"   ? "bg-green-400" :
                  status === "offline"  ? "bg-red-400"   :
                  "bg-zinc-300 animate-pulse"
                }`} />
                <span className="text-zinc-400 group-hover:text-zinc-600 transition-colors">{icon}</span>
              </div>

              <div className="relative">
                <p className="font-semibold text-zinc-900 text-sm mb-0.5">{label}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
