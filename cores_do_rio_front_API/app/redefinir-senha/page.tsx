"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

export default function RedefinirSenhaPage() {
  const [email, setEmail]     = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });
    if (error) { setErro("Erro ao enviar email. Verifique o endereco."); setLoading(false); return; }
    setEnviado(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm tracking-tight">CR</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Redefinir senha</h1>
          <p className="text-zinc-400 text-sm mt-1 text-center">Enviaremos um link para seu email</p>
        </div>

        {enviado ? (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-900">Email enviado!</p>
            <p className="text-xs text-zinc-400">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
            <Link href="/login" className="block mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
            {erro && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email cadastrado</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)} className={INPUT}
                placeholder="seu@email.com"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Enviando..." : "Enviar link de redefinicao"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-400 mt-6">
          <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
