"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

function CRLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      width={80} height={80} fill="#F3ECE0" aria-hidden="true" style={{ display: "block" }}>
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

type Phase = "idle" | "entering" | "visible" | "leaving";

export default function NavigationTransition() {
  const pathname  = usePathname();
  const prevPath  = useRef(pathname);
  const [phase, setPhase] = useState<Phase>("idle");
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Quando um link é clicado, mostra o splash */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel") || href.startsWith("#")) return;
      const target = (a as HTMLAnchorElement).target;
      if (target === "_blank") return;
      /* Mesma rota → sem transição */
      if (href === pathname || href === window.location.pathname) return;

      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      setPhase("entering");
      /* Pequeno delay para CSS transition entrar */
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("visible")));
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  /* Quando o pathname muda (página carregada), inicia o fade-out */
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      if (phase !== "idle") {
        setPhase("leaving");
        leaveTimer.current = setTimeout(() => setPhase("idle"), 550);
      }
    }
    return () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      backgroundColor: "#1A2A3A",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "24px",
      pointerEvents: phase === "leaving" ? "none" : "all",
      opacity: phase === "leaving" ? 0 : 1,
      transition: phase === "leaving"
        ? "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        : "opacity 0.15s ease",
    }}>
      <div style={{
        opacity: phase === "visible" ? 1 : 0,
        transform: phase === "visible" ? "scale(1)" : "scale(0.88)",
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <CRLogo />
      </div>
      {/* Barra de progresso sutil */}
      <div style={{ width: "48px", height: "2px", backgroundColor: "rgba(243,236,224,0.15)", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          backgroundColor: "rgba(243,236,224,0.5)",
          borderRadius: "99px",
          width: phase === "visible" ? "80%" : "20%",
          transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}
