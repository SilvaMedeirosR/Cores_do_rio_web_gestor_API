"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard",      href: "/"                     },
  { label: "Orcamentos",     href: "/orcamentos"           },
  { label: "Compras",        href: "/compras"              },
  { label: "Dep. Pessoal",   href: "/departamento-pessoal" },
  { label: "Financeiro",     href: "/financeiro"           },
  { label: "Metricas",       href: "/metricas"             },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs tracking-tight">CR</span>
            </div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">Cores do Rio</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
                  isActive(item.href)
                    ? "text-zinc-900 font-semibold"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors"
            onClick={() => setOpen(v => !v)}
            aria-label="Menu"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>

        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? "text-zinc-900 font-semibold bg-zinc-50"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
