"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rotaHome } from "@/lib/auth/permissions";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm tracking-tight">CR</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Cores do Rio</h1>
          <p className="text-zinc-400 text-sm mt-1">Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
          {erro && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email</label>
            <input
              type="email" required autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} className={INPUT}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Senha</label>
            <input
              type="password" required autoComplete="current-password" value={senha}
              onChange={e => setSenha(e.target.value)} className={INPUT}
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <Link href="/redefinir-senha" className="text-xs text-zinc-400 hover:text-orange-600 transition-colors">
              Esqueci minha senha
            </Link>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          Nao tem conta?{" "}
          <Link href="/cadastro" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
