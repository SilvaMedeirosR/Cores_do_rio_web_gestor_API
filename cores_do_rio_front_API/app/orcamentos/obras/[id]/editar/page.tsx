"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toastSuccess } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

const ETAPAS = [
  { value: "massa_parede", label: "Massa Parede" },
  { value: "massa_teto",   label: "Massa Teto"   },
  { value: "lixacao",      label: "Lixação"       },
  { value: "pintura",      label: "Pintura"       },
  { value: "acabamento",   label: "Acabamento"    },
];

interface PrecoForm { etapa: string; preco_m2: string; }
interface ObraEditForm { nome: string; local: string; empreiteira: string; precos: PrecoForm[]; }

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

export default function ObraEditarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm]           = useState<ObraEditForm | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSub]      = useState(false);
  const [erro, setErro]           = useState<string | null>(null);
  const [obraNome, setObraNome]   = useState("");

  useEffect(() => {
    fetch(`${API}/obras/${id}`)
      .then(r => r.json())
      .then(j => {
        const obra = j.data;
        if (!obra) return;
        setObraNome(obra.nome);
        setForm({
          nome:  obra.nome,
          local: obra.local,
          empreiteira: obra.empreiteira ?? "",
          precos: ETAPAS.map(e => {
            const p = (obra.obra_precos ?? []).find((x: { etapa: string; preco_m2: number }) => x.etapa === e.value);
            return { etapa: e.value, preco_m2: p ? String(p.preco_m2) : "" };
          }),
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const setPreco = (i: number, v: string) =>
    setForm(p => { if (!p) return p; const a = [...p.precos]; a[i] = { ...a[i], preco_m2: v }; return { ...p, precos: a }; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErro(null); setSub(true);
    try {
      const payload = {
        nome:  form.nome,
        local: form.local,
        empreiteira: form.empreiteira || null,
        precos: form.precos
          .filter(p => p.preco_m2 !== "")
          .map(p => ({ etapa: p.etapa, preco_m2: parseFloat(p.preco_m2) || 0 })),
      };
      const r = await fetch(`${API}/obras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json(); setErro(j.error ?? "Erro ao salvar"); return; }
      toastSuccess("Alterações salvas com sucesso!");
      router.push(`/orcamentos/obras/${id}`);
    } catch { setErro("Erro de conexão com a API"); } finally { setSub(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!form)   return <div className="flex items-center justify-center py-40 text-zinc-400">Obra não encontrada.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700">Orçamentos</Link>
        <span>/</span>
        <Link href="/orcamentos/obras" className="hover:text-zinc-700">Obras</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}`} className="hover:text-zinc-700 truncate max-w-[140px] sm:max-w-none">{obraNome}</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Editar</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-8">Editar Obra</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">

        {/* Dados */}
        <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Dados da Obra</h2>
          {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome *</label>
              <input required value={form.nome} onChange={e => setForm(p => p ? { ...p, nome: e.target.value } : p)}
                className={INPUT} placeholder="Ex: Edificio Central" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Local *</label>
              <input required value={form.local} onChange={e => setForm(p => p ? { ...p, local: e.target.value } : p)}
                className={INPUT} placeholder="Ex: Rua das Flores, 123" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Empreiteira</label>
              <input value={form.empreiteira} onChange={e => setForm(p => p ? { ...p, empreiteira: e.target.value } : p)}
                className={INPUT} placeholder="Ex: Construtora Silva" />
            </div>
          </div>
        </div>

        {/* Precos */}
        <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Preço por m² / Etapa</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {form.precos.map((p, i) => (
              <div key={p.etapa}>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">{ETAPAS[i].label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium pointer-events-none">R$</span>
                  <input type="number" step="0.01" min="0" value={p.preco_m2} onChange={e => setPreco(i, e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                    placeholder="0,00" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-zinc-50 flex items-center justify-end gap-3">
          <Link href={`/orcamentos/obras/${id}`}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={submitting}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            {submitting ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
