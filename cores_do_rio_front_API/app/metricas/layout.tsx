"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Visão Geral", href: "/metricas" },
  { label: "Desempenho",  href: "/metricas/desempenho" },
  { label: "Rotina",      href: "/metricas/rotina" },
];

export default function MetricasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <nav className="flex items-center -mb-px min-w-max sm:min-w-0">
            {tabs.map(tab => {
              const active = tab.href === "/metricas"
                ? pathname === "/metricas"
                : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-[#1A2A3A] text-[#1A2A3A]"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
