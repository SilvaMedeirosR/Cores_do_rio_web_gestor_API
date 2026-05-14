"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

const FUNCOES = [
  { value: "orcamentista",        label: "Orcamentista"        },
  { value: "rh",                  label: "RH"                  },
  { value: "financeiro",          label: "Financeiro"          },
  { value: "materiais",           label: "Materiais"           },
  { value: "gerencia_financeira", label: "Gerencia Financeira" },
  { value: "desenvolvedor",       label: "Desenvolvedor"       },
];

const REQUISITOS = [
  { id: "len",     label: "Minimo 8 caracteres",      test: (v: string) => v.length >= 8                },
  { id: "upper",   label: "Letra maiuscula (A-Z)",    test: (v: string) => /[A-Z]/.test(v)             },
  { id: "lower",   label: "Letra minuscula (a-z)",    test: (v: string) => /[a-z]/.test(v)             },
  { id: "number",  label: "Numero (0-9)",              test: (v: string) => /[0-9]/.test(v)             },
  { id: "special", label: "Caractere especial (!@#…)", test: (v: string) => /[^A-Za-z0-9]/.test(v)    },
];

function forca(senha: string): { score: number; label: string; color: string } {
  const ok = REQUISITOS.filter(r => r.test(senha)).length;
  if (ok <= 1) return { score: ok, label: "Muito fraca",  color: "bg-red-500"    };
  if (ok === 2) return { score: ok, label: "Fraca",        color: "bg-orange-400" };
  if (ok === 3) return { score: ok, label: "Razoavel",     color: "bg-yellow-400" };
  if (ok === 4) return { score: ok, label: "Boa",          color: "bg-blue-400"   };
  return          { score: ok, label: "Forte",        color: "bg-green-500"  };
}

function formatTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CadastroPage() {
  const [form, setForm] = useState({
    nome: "", sobrenome: "", email: "", telefone: "",
    funcao: "", senha: "", confirmarSenha: "",
  });
  const [verSenha, setVerSenha]       = useState(false);
  const [verConfirm, setVerConfirm]   = useState(false);
  const [senhaFoco, setSenhaFoco]     = useState(false);
  const [erro, setErro]               = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [sucesso, setSucesso]         = useState(false);

  const set = (f: keyof typeof form, v: string) => setForm(p => ({ ...p, [f]: v }));

  const senhaOk    = REQUISITOS.every(r => r.test(form.senha));
  const forcaSenha = forca(form.senha);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!form.nome.trim() || !form.sobrenome.trim()) { setErro("Nome e sobrenome sao obrigatorios."); return; }
    if (!form.telefone || form.telefone.replace(/\D/g, "").length < 10) { setErro("Informe um telefone valido com DDD."); return; }
    if (!form.funcao) { setErro("Selecione sua funcao."); return; }
    if (!senhaOk)     { setErro("A senha nao atende todos os requisitos de seguranca."); return; }
    if (form.senha !== form.confirmarSenha) { setErro("As senhas nao coincidem."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: {
          nome:      form.nome.trim(),
          sobrenome: form.sobrenome.trim(),
          telefone:  form.telefone,
          funcao:    form.funcao,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Este email ja esta cadastrado."
          : "Erro ao criar conta. Tente novamente."
      );
      setLoading(false);
      return;
    }

    setSucesso(true);
    setLoading(false);
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900">Cadastro realizado!</p>
              <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                Enviamos um email de confirmacao para{" "}
                <span className="font-medium text-zinc-600">{form.email}</span>.
                Verifique sua caixa de entrada para ativar a conta.
              </p>
            </div>
            <Link href="/login"
              className="block w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-lg text-sm font-medium transition-colors text-center">
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm tracking-tight">CR</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Criar conta</h1>
          <p className="text-zinc-400 text-sm mt-1">Preencha seus dados para acessar o sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-5">
          {erro && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>
          )}

          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome *</label>
              <input
                required value={form.nome}
                onChange={e => set("nome", e.target.value)}
                className={INPUT} placeholder="Rafael"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Sobrenome *</label>
              <input
                required value={form.sobrenome}
                onChange={e => set("sobrenome", e.target.value)}
                className={INPUT} placeholder="Silva"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email *</label>
            <input
              required type="email" value={form.email}
              onChange={e => set("email", e.target.value)}
              className={INPUT} placeholder="seu@email.com" autoComplete="email"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Telefone * <span className="font-normal text-zinc-400">(com DDD)</span>
            </label>
            <input
              required type="tel" value={form.telefone}
              onChange={e => set("telefone", formatTelefone(e.target.value))}
              className={INPUT} placeholder="(21) 99999-0000"
            />
          </div>

          {/* Funcao */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Funcao *</label>
            <select
              required value={form.funcao}
              onChange={e => set("funcao", e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
            >
              <option value="" disabled>Selecione sua funcao</option>
              {FUNCOES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Divisor */}
          <div className="border-t border-zinc-100 pt-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">Senha de acesso</p>

            {/* Campo senha */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Senha *</label>
                <div className="relative">
                  <input
                    required
                    type={verSenha ? "text" : "password"}
                    value={form.senha}
                    onChange={e => set("senha", e.target.value)}
                    onFocus={() => setSenhaFoco(true)}
                    onBlur={() => setSenhaFoco(false)}
                    className={INPUT}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {verSenha ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Barra de força */}
                {form.senha.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= forcaSenha.score ? forcaSenha.color : "bg-zinc-100"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Forca: <span className={`font-medium ${
                        forcaSenha.score >= 5 ? "text-green-600" :
                        forcaSenha.score >= 4 ? "text-blue-600"  :
                        forcaSenha.score >= 3 ? "text-yellow-600":
                        forcaSenha.score >= 2 ? "text-orange-500": "text-red-600"
                      }`}>{forcaSenha.label}</span>
                    </p>
                  </div>
                )}

                {/* Requisitos */}
                {(senhaFoco || form.senha.length > 0) && (
                  <ul className="mt-3 space-y-1.5">
                    {REQUISITOS.map(r => {
                      const ok = r.test(form.senha);
                      return (
                        <li key={r.id} className={`flex items-center gap-2 text-xs transition-colors ${ok ? "text-green-600" : "text-zinc-400"}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${ok ? "bg-green-100" : "bg-zinc-100"}`}>
                            {ok ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : (
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            )}
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
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Confirmar senha *</label>
                <div className="relative">
                  <input
                    required
                    type={verConfirm ? "text" : "password"}
                    value={form.confirmarSenha}
                    onChange={e => set("confirmarSenha", e.target.value)}
                    className={`${INPUT} ${
                      form.confirmarSenha.length > 0
                        ? form.confirmarSenha === form.senha
                          ? "border-green-400 focus:ring-green-400 focus:border-green-400"
                          : "border-red-300 focus:ring-red-400 focus:border-red-400"
                        : ""
                    }`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setVerConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {verConfirm ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {form.confirmarSenha.length > 0 && (
                  <p className={`mt-1.5 text-xs ${form.confirmarSenha === form.senha ? "text-green-600" : "text-red-500"}`}>
                    {form.confirmarSenha === form.senha ? "Senhas coincidem" : "Senhas nao coincidem"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !senhaOk}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-xs text-zinc-400 text-center leading-relaxed">
            Apos o cadastro voce receberá um email de confirmacao para ativar sua conta.
          </p>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          Ja tem conta?{" "}
          <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
