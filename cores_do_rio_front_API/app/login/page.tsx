"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rotaHome } from "@/lib/auth/permissions";

function Logo({ size = 120, color = "#1A2A3A" }: { size?: number; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      fill={color}
      aria-label="Cores do Rio"
      style={{ display: "block" }}
    >
      <path d="M 500 110 L 90 400 L 910 400 L 500 110 Z M 500 195 L 280 350 L 720 350 L 500 195 Z" fillRule="evenodd" />
      <rect x="90"  y="370" width="820" height="60" />
      <rect x="90"  y="830" width="820" height="50" />
      <rect x="155" y="430" width="80"  height="400" />
      <rect x="335" y="430" width="80"  height="400" />
      <rect x="460" y="430" width="80"  height="400" />
      <rect x="585" y="430" width="80"  height="400" />
      <rect x="765" y="430" width="80"  height="400" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [ready, setReady]     = useState(false);
  const [email, setEmail]     = useState("");
  const [senha, setSenha]     = useState("");
  const [erro, setErro]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : error.message === "Email not confirmed"
          ? "Confirme seu email antes de entrar."
          : "Erro ao entrar. Tente novamente."
      );
      setLoading(false);
      return;
    }
    const funcao = data.user?.user_metadata?.funcao as string | undefined;
    router.push(rotaHome(funcao ?? ""));
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", backgroundColor: "#F3ECE0" }}>

      {/* ── Formulário de login (cream, aparece após splash) ── */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: "6vh",
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        {/* Identidade */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "55px" }}>
          <Logo size={88} color="#1A2A3A" />
          <h1 style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.1rem",
            fontWeight: 400,
            color: "#1A2A3A",
            letterSpacing: "0.06em",
            marginTop: "21px",
            marginBottom: "10px",
          }}>
            Cores do Rio
          </h1>
          <p style={{
            fontSize: "0.6rem",
            color: "#1A2A3A",
            opacity: 0.35,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}>
            gestão · análise · automação
          </p>
        </div>

        {/* Formulário */}
        <div style={{ width: "100%", maxWidth: "360px", padding: "0 24px", boxSizing: "border-box" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {erro && (
              <div style={{
                padding: "12px 18px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                backgroundColor: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.18)",
                color: "#b91c1c",
              }}>
                {erro}
              </div>
            )}

            <div>
              <label style={{
                display: "block",
                fontSize: "0.6rem",
                color: "#1A2A3A",
                opacity: 0.38,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}>
                Email
              </label>
              <input
                type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{
                  width: "100%", padding: "13px 18px", borderRadius: "6px",
                  fontSize: "0.875rem", boxSizing: "border-box",
                  backgroundColor: "rgba(26,42,58,0.06)",
                  border: "1px solid rgba(26,42,58,0.13)",
                  color: "#1A2A3A", outline: "none",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#1A2A3A"; e.currentTarget.style.backgroundColor = "#fff"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(26,42,58,0.13)"; e.currentTarget.style.backgroundColor = "rgba(26,42,58,0.06)"; }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.6rem",
                color: "#1A2A3A",
                opacity: 0.38,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}>
                Senha
              </label>
              <input
                type="password" required autoComplete="current-password" value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "13px 18px", borderRadius: "6px",
                  fontSize: "0.875rem", boxSizing: "border-box",
                  backgroundColor: "rgba(26,42,58,0.06)",
                  border: "1px solid rgba(26,42,58,0.13)",
                  color: "#1A2A3A", outline: "none",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#1A2A3A"; e.currentTarget.style.backgroundColor = "#fff"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(26,42,58,0.13)"; e.currentTarget.style.backgroundColor = "rgba(26,42,58,0.06)"; }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-4px" }}>
              <Link href="/redefinir-senha" style={{
                fontSize: "0.68rem", color: "#1A2A3A", opacity: 0.32,
                textDecoration: "none", letterSpacing: "0.03em",
              }}>
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "15px",
                borderRadius: "6px", border: "none",
                backgroundColor: "#1A2A3A", color: "#F3ECE0",
                fontFamily: "var(--font-cormorant)",
                fontSize: "0.9rem", fontWeight: 500,
                letterSpacing: "0.22em", textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.45 : 1,
                transition: "opacity 0.15s",
                marginTop: "6px",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p style={{
            textAlign: "center", fontSize: "0.68rem",
            color: "#1A2A3A", opacity: 0.3,
            marginTop: "34px", letterSpacing: "0.03em",
          }}>
            Não tem conta?{" "}
            <Link href="/cadastro" style={{ opacity: 0.75, textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      {/* ── Splash overlay (navy, some ocupa tela toda, logo centrada) ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#1A2A3A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: ready ? 0 : 1,
          transition: "opacity 0.7s ease",
          pointerEvents: ready ? "none" : "auto",
          zIndex: 50,
        }}
      >
        <Logo size={180} color="#F3ECE0" />
      </div>
    </div>
  );
}
