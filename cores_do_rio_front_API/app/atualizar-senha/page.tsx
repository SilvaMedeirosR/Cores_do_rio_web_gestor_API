"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, X, Lock } from "lucide-react";
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
  width: "100%", padding: "11px 40px 11px 16px", borderRadius: "8px", fontSize: "0.875rem",
  backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.14)",
  color: "#1A2A3A", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const lbl: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px",
  fontSize: "0.65rem", color: "rgba(26,42,58,0.45)",
  letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "6px",
};

export default function AtualizarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha]       = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [verConf, setVerConf]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6)    { setErro("Mínimo 6 caracteres."); return; }
    setErro(null); setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) { setErro("Erro ao atualizar senha. O link pode ter expirado."); setLoading(false); return; }
    router.push("/");
  };

  const match = confirmar.length > 0 && confirmar === senha;
  const mismatch = confirmar.length > 0 && confirmar !== senha;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3ECE0", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
          <CRLogo size={48} color="#1A2A3A" />
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 400, color: "#1A2A3A", marginTop: "16px", marginBottom: "4px" }}>
            Nova senha
          </h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(26,42,58,0.4)", letterSpacing: "0.05em" }}>
            Digite sua nova senha de acesso
          </p>
        </div>

        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "16px", padding: "clamp(1.25rem,4vw,2rem)", boxShadow: "0 4px 24px rgba(26,42,58,0.06)" }}>
          {erro && (
            <div className="anim-shake" style={{ padding: "12px 16px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.8rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
              <X size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} /> {erro}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Nova senha */}
            <div>
              <div style={lbl}><Lock size={10} strokeWidth={2.5} />Nova senha</div>
              <div style={{ position: "relative" }}>
                <input required type={verSenha ? "text" : "password"} value={senha}
                  onChange={e => setSenha(e.target.value)} placeholder="••••••••"
                  autoComplete="new-password" style={field}
                  onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
                />
                <button type="button" tabIndex={-1} onClick={() => setVerSenha(v => !v)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(26,42,58,0.35)", padding: "2px" }}>
                  {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirmar */}
            <div>
              <div style={lbl}><Check size={10} strokeWidth={2.5} />Confirmar senha</div>
              <div style={{ position: "relative" }}>
                <input required type={verConf ? "text" : "password"} value={confirmar}
                  onChange={e => setConfirmar(e.target.value)} placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ ...field, borderColor: match ? "#22c55e" : mismatch ? "#ef4444" : "rgba(26,42,58,0.14)" }}
                  onFocus={e => { e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                  onBlur={e  => { e.currentTarget.style.boxShadow="none"; }}
                />
                <button type="button" tabIndex={-1} onClick={() => setVerConf(v => !v)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(26,42,58,0.35)", padding: "2px" }}>
                  {verConf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {match && (
                <p style={{ marginTop: "5px", fontSize: "0.7rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Check size={11} strokeWidth={3} /> Senhas coincidem
                </p>
              )}
              {mismatch && (
                <p style={{ marginTop: "5px", fontSize: "0.7rem", color: "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}>
                  <X size={11} strokeWidth={3} /> Senhas não coincidem
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="cr-btn-primary"
              style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", backgroundColor: "#1A2A3A", color: "#F3ECE0", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", opacity: loading ? 0.55 : 1, transition: "opacity 0.15s", marginTop: "4px" }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
