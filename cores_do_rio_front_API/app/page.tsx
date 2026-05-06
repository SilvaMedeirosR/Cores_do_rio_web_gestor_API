"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const MODULES = [
  {
    label: "Orcamentos",
    href: "/orcamentos",
    api: process.env.NEXT_PUBLIC_API_ORCAMENTO,
    desc: "Planejamento e gestao de orcamentos",
    icon: "ðŸ“‹",
  },
  {
    label: "Compras",
    href: "/compras",
    api: process.env.NEXT_PUBLIC_API_COMPRAS,
    desc: "Pedidos e ordens de compra",
    icon: "ðŸ›’",
  },
  {
    label: "Depto. Pessoal",
    href: "/departamento-pessoal",
    api: process.env.NEXT_PUBLIC_API_DEP_PESS,
    desc: "Gestao de funcionarios e registros de DP",
    icon: "ðŸ‘¥",
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    api: process.env.NEXT_PUBLIC_API_FINANCEIRO,
    desc: "Lancamentos e transacoes financeiras",
    icon: "ðŸ’°",
  },
];

type StatusMap = Record<string, "checking" | "online" | "offline">;

export default function Home() {
  const [statuses, setStatuses] = useState<StatusMap>(
    Object.fromEntries(MODULES.map((m) => [m.label, "checking"]))
  );

  useEffect(() => {
    MODULES.forEach(async ({ label, api }) => {
      if (!api) {
        setStatuses((s) => ({ ...s, [label]: "offline" }));
        return;
      }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 mt-1">
          {onlineCount === MODULES.length
            ? "Todos os modulos online"
            : `${onlineCount} de ${MODULES.length} modulos online`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {MODULES.map(({ label, href, desc, icon }) => {
          const status = statuses[label];
          return (
            <Link
              key={label}
              href={href}
              className="bg-white rounded-xl border border-zinc-200 p-6 hover:border-orange-400 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{icon}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1 ${
                    status === "online"
                      ? "bg-green-500"
                      : status === "offline"
                      ? "bg-red-500"
                      : "bg-zinc-300 animate-pulse"
                  }`}
                />
              </div>
              <h2 className="font-semibold text-zinc-900 group-hover:text-orange-600 transition-colors mb-1">
                {label}
              </h2>
              <p className="text-sm text-zinc-500">{desc}</p>
            </Link>
          );
        })}
      </div>

    </div>
  );
}