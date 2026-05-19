"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Check, X, User, Mail, Phone, Briefcase, CheckCircle2, ArrowLeft } from "lucide-react";
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

const FUNCOES = [
  { value: "titular",             label: "Titular"             },
  { value: "orcamentista",        label: "Orçamentista"        },
  { value: "rh",                  label: "RH"                  },
  { value: "financeiro",          label: "Financeiro"          },
  { value: "materiais",           label: "Materiais"           },
  { value: "gerencia_financeira", label: "Gerência Financeira" },
  { value: "desenvolvedor",       label: "Desenvolvedor"       },
];

const REQUISITOS = [
  { id: "len",     label: "Mínimo 8 caracteres",        test: (v: string) => v.length >= 8          },
  { id: "upper",   label: "Letra maiúscula (A–Z)",      test: (v: string) => /[A-Z]/.test(v)        },
  { id: "lower",   label: "Letra minúscula (a–z)",      test: (v: string) => /[a-z]/.test(v)        },
  { id: "number",  label: "Número (0–9)",                test: (v: string) => /[0-9]/.test(v)        },
  { id: "special", label: "Caractere especial (!@#…)",  test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function forca(s: string) {
  const n = REQUISITOS.filter(r => r.test(s)).length;
  if (n <= 1) return { score: n, label: "Muito fraca",  color: "#ef4444" };
  if (n === 2) return { score: n, label: "Fraca",        color: "#f59e0b" };
  if (n === 3) return { score: n, label: "Razoável",     color: "#eab308" };
  if (n === 4) return { score: n, label: "Boa",          color: "#3b82f6" };
  return               { score: n, label: "Forte",        color: "#22c55e" };
}

function formatTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

/* ── Estilos compartilhados ── */
const field: React.CSSProperties = {
  width: "100%", padding: "11px 16px", borderRadius: "8px", fontSize: "0.875rem",
  backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.14)",
  color: "#1A2A3A", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const label: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px",
  fontSize: "0.65rem", color: "rgba(26,42,58,0.45)",
  letterSpacing: "0.14em", textTransform: "uppercase",
  marginBottom: "6px",
};

export default function CadastroPage() {
  const [form, setForm] = useState({
    nome: "", sobrenome: "", email: "", telefone: "", funcao: "", senha: "", confirmarSenha: "",
  });
  const [verSenha,    setVerSenha]    = useState(false);
  const [verConfirm,  setVerConfirm]  = useState(false);
  const [senhaFoco,   setSenhaFoco]   = useState(false);
  const [erro,        setErro]        = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [sucesso,     setSucesso]     = useState(false);

  const set = (f: keyof typeof form, v: string) => setForm(p => ({ ...p, [f]: v }));
  const senhaOk    = REQUISITOS.every(r => r.test(form.senha));
  const forcaSenha = forca(form.senha);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null);
    if (!form.nome.trim() || !form.sobrenome.trim()) { setErro("Nome e sobrenome são obrigatórios."); return; }
    if (form.telefone.replace(/\D/g,"").length < 10) { setErro("Informe um telefone válido com DDD."); return; }
    if (!form.funcao) { setErro("Selecione sua função."); return; }
    if (!senhaOk)     { setErro("A senha não atende todos os requisitos."); return; }
    if (form.senha !== form.confirmarSenha) { setErro("As senhas não coincidem."); return; }

    setLoading(true);
    const { error } = await createClient().auth.signUp({
      email: form.email, password: form.senha,
      options: {
        data: { nome: form.nome.trim(), sobrenome: form.sobrenome.trim(), telefone: form.telefone, funcao: form.funcao },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      setErro(error.message.includes("already registered") ? "Este email já está cadastrado." : "Erro ao criar conta. Tente novamente.");
      setLoading(false); return;
    }
    setSucesso(true); setLoading(false);
  };

  /* ── Tela de sucesso ── */
  if (sucesso) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3ECE0", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "16px", padding: "48px 32px", textAlign: "center" }}>
        <div className="anim-success-circle" style={{
          width: "64px", height: "64px", borderRadius: "50%",
          backgroundColor: "rgba(34,197,94,0.1)", display: "flex",
          alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
        }}>
          <CheckCircle2 size={32} color="#22c55e" strokeWidth={1.5} />
        </div>
        <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.75rem", fontWeight: 400, color: "#1A2A3A", marginBottom: "12px" }}>
          Conta criada!
        </h2>
        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.5)", lineHeight: 1.7, marginBottom: "32px" }}>
          Enviamos um email de confirmação para{" "}
          <strong style={{ color: "#1A2A3A" }}>{form.email}</strong>.
          Verifique sua caixa de entrada para ativar a conta.
        </p>
        <Link href="/login" style={{
          display: "block", padding: "13px", borderRadius: "8px",
          backgroundColor: "#1A2A3A", color: "#F3ECE0", textDecoration: "none",
          fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase", transition: "opacity 0.15s",
        }}>
          Ir para o login
        </Link>
      </div>
    </div>
  );

  /* ── Formulário ── */
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3ECE0", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>

        {/* Identidade */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
          <CRLogo size={48} color="#1A2A3A" />
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 400, color: "#1A2A3A", marginTop: "16px", marginBottom: "4px" }}>
            Criar conta
          </h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(26,42,58,0.4)", letterSpacing: "0.05em" }}>
            Preencha seus dados para acessar o sistema
          </p>
        </div>

        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "16px", padding: "clamp(1.25rem,4vw,2rem)", boxShadow: "0 4px 24px rgba(26,42,58,0.06)" }}>

          {erro && (
            <div className="anim-shake" style={{
              padding: "12px 16px", marginBottom: "20px", borderRadius: "8px",
              backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: "0.8rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px",
            }}>
              <X size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Nome + Sobrenome */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[["nome","Nome","Rafael"],["sobrenome","Sobrenome","Silva"]].map(([key,lbl,ph]) => (
                <div key={key}>
                  <div style={label}><User size={10} strokeWidth={2.5} />{lbl} *</div>
                  <input value={form[key as keyof typeof form]} onChange={e => set(key as keyof typeof form, e.target.value)}
                    required placeholder={ph} style={field}
                    onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                    onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
                  />
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <div style={label}><Mail size={10} strokeWidth={2.5} />Email *</div>
              <input type="email" required value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="seu@email.com" autoComplete="email" style={field}
                onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
              />
            </div>

            {/* Telefone */}
            <div>
              <div style={label}><Phone size={10} strokeWidth={2.5} />Telefone * <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(com DDD)</span></div>
              <input type="tel" required value={form.telefone} onChange={e => set("telefone", formatTelefone(e.target.value))}
                placeholder="(21) 99999-0000" style={field}
                onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
              />
            </div>

            {/* Função */}
            <div>
              <div style={label}><Briefcase size={10} strokeWidth={2.5} />Função *</div>
              <select required value={form.funcao} onChange={e => set("funcao", e.target.value)} style={field}
                onFocus={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
              >
                <option value="" disabled>Selecione sua função</option>
                {FUNCOES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Divisor */}
            <div style={{ borderTop: "1px solid rgba(26,42,58,0.08)", paddingTop: "4px" }}>
              <p style={{ fontSize: "0.6rem", color: "rgba(26,42,58,0.35)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
                Senha de acesso
              </p>

              {/* Senha */}
              <div style={{ marginBottom: "14px" }}>
                <div style={label}><Eye size={10} strokeWidth={2.5} />Senha *</div>
                <div style={{ position: "relative" }}>
                  <input type={verSenha ? "text" : "password"} required value={form.senha}
                    onChange={e => set("senha", e.target.value)}
                    onFocus={() => setSenhaFoco(true)} onBlur={() => setSenhaFoco(false)}
                    placeholder="••••••••" autoComplete="new-password"
                    style={field}
                    onFocusCapture={e => { e.currentTarget.style.borderColor="#1A2A3A"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                    onBlurCapture={e  => { e.currentTarget.style.borderColor="rgba(26,42,58,0.14)"; e.currentTarget.style.boxShadow="none"; }}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setVerSenha(v => !v)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(26,42,58,0.35)", padding: "2px" }}>
                    {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {form.senha.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    {/* Barra de força */}
                    <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          height: "3px", flex: 1, borderRadius: "99px",
                          backgroundColor: i <= forcaSenha.score ? forcaSenha.color : "rgba(26,42,58,0.1)",
                          transition: "background-color 0.3s",
                        }}/>
                      ))}
                    </div>
                    <p style={{ fontSize: "0.68rem", color: "rgba(26,42,58,0.45)" }}>
                      Força: <span style={{ fontWeight: 600, color: forcaSenha.color }}>{forcaSenha.label}</span>
                    </p>
                  </div>
                )}

                {(senhaFoco || form.senha.length > 0) && (
                  <ul style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {REQUISITOS.map(r => {
                      const ok = r.test(form.senha);
                      return (
                        <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem", color: ok ? "#16a34a" : "rgba(26,42,58,0.4)", transition: "color 0.2s" }}>
                          <span style={{ width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: ok ? "rgba(34,197,94,0.12)" : "rgba(26,42,58,0.06)", transition: "background-color 0.2s" }}>
                            {ok ? <Check size={9} strokeWidth={3} color="#16a34a"/> : <X size={8} strokeWidth={3} color="rgba(26,42,58,0.35)"/>}
                          </span>
                          {r.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirmar senha */}
              <div>
                <div style={label}><Check size={10} strokeWidth={2.5} />Confirmar senha *</div>
                <div style={{ position: "relative" }}>
                  <input type={verConfirm ? "text" : "password"} required value={form.confirmarSenha}
                    onChange={e => set("confirmarSenha", e.target.value)}
                    placeholder="••••••••" autoComplete="new-password"
                    style={{
                      ...field,
                      borderColor: form.confirmarSenha.length > 0
                        ? form.confirmarSenha === form.senha ? "#22c55e" : "#ef4444"
                        : "rgba(26,42,58,0.14)",
                    }}
                    onFocus={e => { e.currentTarget.style.boxShadow="0 0 0 3px rgba(26,42,58,0.08)"; }}
                    onBlur={e  => { e.currentTarget.style.boxShadow="none"; }}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setVerConfirm(v => !v)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(26,42,58,0.35)", padding: "2px" }}>
                    {verConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.confirmarSenha.length > 0 && (
                  <p style={{ marginTop: "5px", fontSize: "0.7rem", color: form.confirmarSenha === form.senha ? "#16a34a" : "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}>
                    {form.confirmarSenha === form.senha
                      ? <><Check size={11} strokeWidth={3}/> Senhas coincidem</>
                      : <><X size={11} strokeWidth={3}/> Senhas não coincidem</>}
                  </p>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading || !senhaOk}
              className="cr-btn-primary"
              style={{
                width: "100%", padding: "14px", borderRadius: "8px", border: "none",
                backgroundColor: "#1A2A3A", color: "#F3ECE0", cursor: loading || !senhaOk ? "not-allowed" : "pointer",
                fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                opacity: loading || !senhaOk ? 0.45 : 1, transition: "opacity 0.15s, transform 0.1s",
                marginTop: "4px",
              }}>
              {loading ? "Criando conta..." : "Criar conta"}
            </button>

            <p style={{ fontSize: "0.68rem", color: "rgba(26,42,58,0.35)", textAlign: "center", lineHeight: 1.6 }}>
              Após o cadastro você receberá um email de confirmação para ativar sua conta.
            </p>
          </form>
        </div>

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
