"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { temAcesso, type Funcao } from "@/lib/auth/permissions";

const FOLHA_API = process.env.NEXT_PUBLIC_API_FOLHA ?? "";
interface Notificacao { id: string; titulo: string; corpo: string | null; tipo: string; lida: boolean; created_at: string; }

const ALL_navItems = [
  { label: "Métricas",     mobileLabel: "Métricas",   href: "/metricas"                   },
  { label: "Orçamentos",   mobileLabel: "Orçam.",     href: "/orcamentos"                 },
  { label: "Compras",      mobileLabel: "Compras",    href: "/compras"                    },
  { label: "Dep. Pessoal", mobileLabel: "DP",         href: "/departamento-pessoal"       },
  { label: "Folha / DP",   mobileLabel: "Folha DP",   href: "/departamento-pessoal/folha" },
  { label: "Financeiro",   mobileLabel: "Financ.",    href: "/financeiro"                 },
  { label: "Folha / Fin.", mobileLabel: "Folha Fin.", href: "/financeiro/folha"           },
];

const FUNCAO_LABEL: Record<string, string> = {
  orcamentista:        "Orçamentista",
  rh:                  "RH",
  financeiro:          "Financeiro",
  materiais:           "Materiais",
  gerencia_financeira: "Gerência Financeira",
  desenvolvedor:       "Desenvolvedor",
  titular:             "Titular",
  beneficios:          "Benefícios",
};

interface Profile { nome: string; sobrenome: string; funcao: string; }

function CRLogo({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      width={size} height={size} fill="#F3ECE0" aria-label="Cores do Rio"
      style={{ display: "block", flexShrink: 0 }}>
      <path d="M 500 110 L 90 400 L 910 400 L 500 110 Z M 500 195 L 280 350 L 720 350 L 500 195 Z" fillRule="evenodd"/>
      <rect x="90"  y="370" width="820" height="60"/>
      <rect x="90"  y="830" width="820" height="50"/>
      <rect x="155" y="430" width="80"  height="400"/>
      <rect x="335" y="430" width="80"  height="400"/>
      <rect x="460" y="430" width="80"  height="400"/>
      <rect x="585" y="430" width="80"  height="400"/>
      <rect x="765" y="430" width="80"  height="400"/>
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();

  const [userOpen,      setUserOpen]      = useState(false);
  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [userEmail,     setUserEmail]     = useState("");
  const [funcao,        setFuncao]        = useState<Funcao | null>(null);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifs,        setNotifs]        = useState<Notificacao[]>([]);
  const [logoExpanded,  setLogoExpanded]  = useState(true);

  const userRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const navItems = funcao ? ALL_navItems.filter(i => temAcesso(funcao, i.href)) : [];

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      const t = setTimeout(() => setLogoExpanded(false), 1600);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserEmail(data.user.email ?? "");
      const f = data.user.user_metadata?.funcao as Funcao | undefined;
      if (f) setFuncao(f);
      sb.from("profiles").select("nome, sobrenome, funcao").eq("id", data.user.id).single()
        .then(({ data: p }) => { if (p) { setProfile(p); setFuncao(p.funcao as Funcao); } });
    });
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchNotifs = async (email: string) => {
    if (!email || !FOLHA_API) return;
    try {
      const r = await fetch(`${FOLHA_API}/notificacoes?destinatario=${encodeURIComponent(email)}`);
      setNotifs((await r.json()).data ?? []);
    } catch { /* noop */ }
  };

  useEffect(() => { if (userEmail) fetchNotifs(userEmail); }, [userEmail]);
  useEffect(() => {
    if (!userEmail) return;
    const iv = setInterval(() => fetchNotifs(userEmail), 60000);
    return () => clearInterval(iv);
  }, [userEmail]);

  const marcarTodasLidas = async () => {
    if (!userEmail || !FOLHA_API) return;
    await fetch(`${FOLHA_API}/notificacoes/ler`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinatario: userEmail }),
    }).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const unreadCount = notifs.filter(n => !n.lida).length;

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const initials = profile
    ? `${profile.nome[0]}${profile.sobrenome[0]}`.toUpperCase()
    : userEmail[0]?.toUpperCase() ?? "?";

  const NAV = "#1A2A3A";
  const CRM = "#F3ECE0";
  const navLinkBase: React.CSSProperties = {
    padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem",
    letterSpacing: "0.02em", transition: "all 0.15s", whiteSpace: "nowrap", textDecoration: "none",
  };

  return (
    <header style={{ backgroundColor: NAV, borderBottom: "1px solid rgba(243,236,224,0.08)", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(0.75rem, 3vw, 1.5rem)" }}>
        <div style={{ display: "flex", alignItems: "center", height: "56px", gap: "6px" }}>

          {/* Logo */}
          <Link href="/"
            style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", flexShrink: 0 }}>
            <CRLogo size={22} />
            <span className="cr-logo-text" style={{
              fontFamily: "var(--font-cormorant)", color: CRM,
              fontSize: "1rem", letterSpacing: "0.14em", textTransform: "uppercase",
              maxWidth: logoExpanded ? "200px" : "0px",
              opacity: logoExpanded ? 1 : 0,
              overflow: "hidden",
              transition: "max-width 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease",
              whiteSpace: "nowrap",
              display: "block",
            }}>
              Cores do Rio
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, marginLeft: "4px" }} className="hidden md:flex">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} style={{
                ...navLinkBase,
                color: isActive(item.href) ? CRM : "rgba(243,236,224,0.45)",
                fontWeight: isActive(item.href) ? 600 : 400,
                backgroundColor: isActive(item.href) ? "rgba(243,236,224,0.08)" : "transparent",
              }}
                onMouseEnter={e => { if (!isActive(item.href)) (e.currentTarget as HTMLElement).style.color = "rgba(243,236,224,0.85)"; }}
                onMouseLeave={e => { if (!isActive(item.href)) (e.currentTarget as HTMLElement).style.color = "rgba(243,236,224,0.45)"; }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile nav — inline scrollable, same bar */}
          <div className="cr-nav-strip md:hidden" style={{ flex: 1, display: "flex", alignItems: "center", overflowX: "auto", height: "100%" }}>
            <div style={{ display: "flex", gap: "2px", alignItems: "center", minWidth: "max-content", padding: "0 2px" }}>
              {navItems.map(item => (
                <Link key={item.href} href={item.href} style={{
                  padding: "5px 9px",
                  fontSize: "0.72rem",
                  fontWeight: isActive(item.href) ? 600 : 400,
                  color: isActive(item.href) ? CRM : "rgba(243,236,224,0.52)",
                  backgroundColor: isActive(item.href) ? "rgba(243,236,224,0.10)" : "transparent",
                  borderRadius: "5px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s, background-color 0.15s",
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                }}>
                  {item.mobileLabel}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>

            {/* Notificações */}
            {userEmail && FOLHA_API && (
              <div style={{ position: "relative" }} ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(v => !v); if (!notifOpen) fetchNotifs(userEmail); }}
                  title="Notificações"
                  style={{
                    position: "relative", padding: "8px", borderRadius: "8px", border: "none",
                    backgroundColor: "transparent", color: "rgba(243,236,224,0.55)", cursor: "pointer",
                    transition: "color 0.15s, background-color 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = CRM; (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(243,236,224,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(243,236,224,0.55)"; (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <span className={unreadCount > 0 ? "bell-ring" : ""} style={{ display: "block" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  </span>
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: "4px", right: "4px",
                      minWidth: "15px", height: "15px", borderRadius: "99px",
                      backgroundColor: "#e55", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px", fontWeight: 700, padding: "0 3px",
                      animation: "anim-success-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
                    }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="slide-up-fade" style={{
                    position: "fixed", right: "clamp(0.75rem, 3vw, 1.5rem)", top: "calc(var(--header-h, 56px) + 6px)",
                    width: "min(300px, calc(100vw - 1.5rem))", backgroundColor: "#fff",
                    border: "1px solid rgba(26,42,58,0.1)",
                    borderRadius: "12px", boxShadow: "0 8px 32px rgba(26,42,58,0.12)",
                    overflow: "hidden", zIndex: 60,
                  }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,42,58,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: NAV }}>Notificações</span>
                      {unreadCount > 0 && (
                        <button onClick={marcarTodasLidas} style={{ fontSize: "0.7rem", color: NAV, opacity: 0.5, border: "none", background: "none", cursor: "pointer", textDecoration: "underline" }}>
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                      {notifs.length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.35)", textAlign: "center", padding: "32px 16px" }}>Sem notificações</p>
                      ) : notifs.map(n => (
                        <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,42,58,0.04)", backgroundColor: !n.lida ? "rgba(26,42,58,0.03)" : "transparent", transition: "background-color 0.3s ease" }}>
                          <p style={{ fontSize: "0.75rem", color: NAV, fontWeight: n.lida ? 400 : 600, lineHeight: 1.4 }}>{n.titulo}</p>
                          {n.corpo && <p style={{ fontSize: "0.7rem", color: "rgba(26,42,58,0.45)", marginTop: "2px" }}>{n.corpo}</p>}
                          <p style={{ fontSize: "0.62rem", color: "rgba(26,42,58,0.25)", marginTop: "4px" }}>{fmtTime(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Menu do utilizador */}
            <div style={{ position: "relative" }} ref={userRef}>
              <button
                onClick={() => setUserOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 10px", borderRadius: "8px", border: "none",
                  backgroundColor: "transparent", cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(243,236,224,0.08)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
              >
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  backgroundColor: "rgba(243,236,224,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: CRM, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.05em" }}>{initials}</span>
                </div>
                <div className="hidden sm:block" style={{ textAlign: "left" }}>
                  {profile && (
                    <p style={{ fontSize: "0.75rem", fontWeight: 500, color: CRM, lineHeight: 1 }}>{profile.nome} {profile.sobrenome}</p>
                  )}
                  <p style={{ fontSize: "0.65rem", color: "rgba(243,236,224,0.45)", lineHeight: 1, marginTop: "3px" }}>
                    {profile ? FUNCAO_LABEL[profile.funcao] ?? profile.funcao : userEmail}
                  </p>
                </div>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(243,236,224,0.35)" strokeWidth="2" className="hidden sm:block">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {userOpen && (
                <div className="slide-up-fade" style={{
                  position: "fixed", right: "clamp(0.75rem, 3vw, 1.5rem)", top: "calc(var(--header-h, 56px) + 6px)",
                  width: "min(210px, calc(100vw - 1.5rem))", backgroundColor: "#fff",
                  border: "1px solid rgba(26,42,58,0.1)", borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(26,42,58,0.12)", overflow: "hidden", zIndex: 60,
                }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(26,42,58,0.06)" }}>
                    {profile && <p style={{ fontSize: "0.85rem", fontWeight: 600, color: NAV }}>{profile.nome} {profile.sobrenome}</p>}
                    <p style={{ fontSize: "0.7rem", color: "rgba(26,42,58,0.4)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
                    {profile && (
                      <span style={{
                        display: "inline-block", marginTop: "6px",
                        padding: "2px 8px", borderRadius: "99px",
                        backgroundColor: "rgba(26,42,58,0.07)", color: NAV,
                        fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.04em",
                      }}>
                        {FUNCAO_LABEL[profile.funcao] ?? profile.funcao}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%", padding: "11px 16px", textAlign: "left",
                      border: "none", background: "none", cursor: "pointer",
                      fontSize: "0.8rem", color: "#dc2626",
                      display: "flex", alignItems: "center", gap: "8px",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(220,38,38,0.05)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </header>
  );
}

