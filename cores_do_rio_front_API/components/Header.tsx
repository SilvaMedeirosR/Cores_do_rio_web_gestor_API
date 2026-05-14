"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { temAcesso, type Funcao } from "@/lib/auth/permissions";

const ALL_navItems = [
  { label: "Metricas",     href: "/metricas"             },
  { label: "Orcamentos",   href: "/orcamentos"           },
  { label: "Compras",      href: "/compras"              },
  { label: "Dep. Pessoal", href: "/departamento-pessoal" },
  { label: "Financeiro",   href: "/financeiro"           },
];

const FUNCAO_LABEL: Record<string, string> = {
  orcamentista:        "Orcamentista",
  rh:                  "RH",
  financeiro:          "Financeiro",
  materiais:           "Materiais",
  gerencia_financeira: "Gerencia Financeira",
  desenvolvedor:       "Desenvolvedor",
  titular:             "Titular",
};

interface Profile { nome: string; sobrenome: string; funcao: string; }

export default function Header() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [open, setOpen]           = useState(false);
  const [userOpen, setUserOpen]   = useState(false);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [funcao, setFuncao]       = useState<Funcao | null>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const navItems = funcao
    ? ALL_navItems.filter(item => temAcesso(funcao, item.href))
    : [];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserEmail(data.user.email ?? "");
      const f = data.user.user_metadata?.funcao as Funcao | undefined;
      if (f) setFuncao(f);
      supabase
        .from("profiles")
        .select("nome, sobrenome, funcao")
        .eq("id", data.user.id)
        .single()
        .then(({ data: p }) => {
          if (p) {
            setProfile(p);
            setFuncao(p.funcao as Funcao);
          }
        });
    });
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const initials = profile
    ? `${profile.nome.charAt(0)}${profile.sobrenome.charAt(0)}`.toUpperCase()
    : userEmail.charAt(0).toUpperCase();

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
            {navItems.map((item) => (
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

          <div className="flex items-center gap-2">
            {/* User menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-orange-700 font-semibold text-xs">{initials}</span>
                </div>
                <div className="hidden sm:block text-left">
                  {profile && (
                    <p className="text-xs font-medium text-zinc-900 leading-none">{profile.nome} {profile.sobrenome}</p>
                  )}
                  <p className="text-xs text-zinc-400 leading-none mt-0.5">
                    {profile ? FUNCAO_LABEL[profile.funcao] ?? profile.funcao : userEmail}
                  </p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 hidden sm:block">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {userOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50">
                  <div className="px-4 py-3 border-b border-zinc-100">
                    {profile && (
                      <p className="text-sm font-semibold text-zinc-900">{profile.nome} {profile.sobrenome}</p>
                    )}
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{userEmail}</p>
                    {profile && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                        {FUNCAO_LABEL[profile.funcao] ?? profile.funcao}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>

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
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            {navItems.map((item) => (
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
            <button
              onClick={handleLogout}
              className="mt-1 px-3 py-2.5 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              Sair
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
