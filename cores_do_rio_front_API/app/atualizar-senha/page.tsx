"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

export default function AtualizarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha]             = useState("");
  const [confirmar, setConfirmar]     = useState("");
  const [erro, setErro]               = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) { setErro("As senhas nao coincidem."); return; }
    if (senha.length < 6)   { setErro("Minimo 6 caracteres."); return; }
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { setErro("Erro ao atualizar senha. O link pode ter expirado."); setLoading(false); return; }
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm tracking-tight">CR</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Nova senha</h1>
          <p className="text-zinc-400 text-sm mt-1">Digite sua nova senha de acesso</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
          {erro && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nova senha</label>
            <input required type="password" value={senha} onChange={e => setSenha(e.target.value)}
              className={INPUT} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Confirmar senha</label>
            <input required type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
              className={INPUT} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
