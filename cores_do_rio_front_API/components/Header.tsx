"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard",        href: "/"                    },
  { label: "Orcamentos",       href: "/orcamentos"          },
  { label: "Compras",          href: "/compras"             },
  { label: "Depto. Pessoal",   href: "/departamento-pessoal" },
  { label: "Financeiro",       href: "/financeiro"          },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CR</span>
            </div>
            <span className="text-lg font-bold text-zinc-900">Cores do Rio</span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === item.href
                    ? "bg-orange-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

        </div>
      </div>
    </header>
  );
}