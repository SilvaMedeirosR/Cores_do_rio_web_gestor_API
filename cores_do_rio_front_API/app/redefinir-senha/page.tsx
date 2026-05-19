"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function CRLogo({ size = 32, color = "#1A2A3A" }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      width={size} height={size} fill={color} aria-label="Cores do Rio" style={{ display: "block" }}>
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

const field: React.CSSProperties = {
  width: "100%", padding: "11px 16px", borderRadius: "8px", fontSize: "0.875rem",
  backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.14)",
  color: "#1A2A3A", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const lbl: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px",
  fontSize: "0.65rem", color: "rgba(26,42,58,0.45)",
  letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "6px",
};

export default function RedefinirSenhaPage() {
  const [email, setEmail]     = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null); setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });
    if (error) { setErro("Erro ao enviar email. Verifique o endereço."); setLoading(false); return; }
    setEnviado(true); setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3ECE0", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
          <CRLogo size={48} color="#1A2A3A" />
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 400, color: "#1A2A3A", marginTop: "16px", marginBottom: "4px" }}>
            Redefinir senha
          </h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(26,42,58,0.4)", letterSpacing: "0.05em" }}>
            Enviaremos um link para seu email
          </p>
        </div>

        {enviado ? (
          <div className="anim-success-pop" style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "16px", padding: "40px 32px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle2 size={32} color="#22c55e" strokeWidth={1.5} />
            </div>
            <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", fontWeight: 400, color: "#1A2A3A", marginBottom: "10px" }}>Email enviado!</p>
            <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.5)", lineHeight: 1.7, marginBottom: "24px" }}>
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#1A2A3A", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              <ArrowLeft size={12} /> Voltar ao login
            </Link>
          </div>
        ) : (
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "16px", padding: "clamp(1.25rem,4vw,2rem)", boxShadow: "0 4px 24px rgba(26,42,58,0.06)" }}>
            {erro && (
              <div className="anim-shake" style={{ padding: "12px 16px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.8rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
                <X size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} /> {erro}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <div style={lbl}><Mail size={10} strokeWidth={2.5} />Email cadastrado</div>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" style={field}
                  onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
                />
              </div>
              <button type="submit" disabled={loading} className="cr-btn-primary"
                style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", backgroundColor: "#1A2A3A", color: "#F3ECE0", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", opacity: loading ? 0.55 : 1, transition: "opacity 0.15s" }}>
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(26,42,58,0.4)", marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <ArrowLeft size={12} />
          <Link href="/login" style={{ color: "#1A2A3A", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
