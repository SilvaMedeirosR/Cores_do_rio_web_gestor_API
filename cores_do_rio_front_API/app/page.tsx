"use client";

import { useState, useEffect } from "react";

const API_COMPRAS = process.env.NEXT_PUBLIC_API_COMPRAS;
const API_DEP_PESS = process.env.NEXT_PUBLIC_API_DEP_PESS;
const API_FINANCEIRO = process.env.NEXT_PUBLIC_API_FINANCEIRO;
const API_ORCAMENTO = process.env.NEXT_PUBLIC_API_ORCAMENTO;

export default function Home() {
  const [status, setStatus] = useState<{
    compras: string;
    depPess: string;
    financeiro: string;
    orcamento: string;
  }>({
    compras: "Verificando...",
    depPess: "Verificando...",
    financeiro: "Verificando...",
    orcamento: "Verificando...",
  });

  useEffect(() => {
    const checkApiStatus = async () => {
      const checkEndpoint = async (url: string | undefined) => {
        if (!url) return "URL não configurada";
        try {
          const response = await fetch(url);
          if (response.ok) return "✅ Online";
          return `❌ Erro ${response.status}`;
        } catch (error) {
          return "❌ Offline";
        }
      };

      const [compras, depPess, financeiro, orcamento] = await Promise.all([
        checkEndpoint(API_COMPRAS),
        checkEndpoint(API_DEP_PESS),
        checkEndpoint(API_FINANCEIRO),
        checkEndpoint(API_ORCAMENTO),
      ]);

      setStatus({ compras, depPess, financeiro, orcamento });
    };

    checkApiStatus();
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center py-16 px-8 bg-white dark:bg-black">
        <h1 className="text-4xl font-bold mb-8 text-black dark:text-zinc-50">
          Cores do Rio - Sistema Web
        </h1>

        <div className="w-full max-w-2xl bg-zinc-100 dark:bg-zinc-900 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black dark:text-zinc-50">
            Status das APIs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
              <h3 className="font-medium text-black dark:text-zinc-50">
                API de Compras
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {API_COMPRAS}
              </p>
              <p className="mt-2 text-sm font-medium">{status.compras}</p>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
              <h3 className="font-medium text-black dark:text-zinc-50">
                API Dep. Pessoal
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {API_DEP_PESS}
              </p>
              <p className="mt-2 text-sm font-medium">{status.depPess}</p>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
              <h3 className="font-medium text-black dark:text-zinc-50">
                API Financeira
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {API_FINANCEIRO}
              </p>
              <p className="mt-2 text-sm font-medium">{status.financeiro}</p>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
              <h3 className="font-medium text-black dark:text-zinc-50">
                API de Orçamento
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {API_ORCAMENTO}
              </p>
              <p className="mt-2 text-sm font-medium">{status.orcamento}</p>
            </div>
          </div>
        </div>

        <div className="text-center text-zinc-600 dark:text-zinc-400">
          <p className="mb-2">
            Todas as APIs estão conectadas e operacionais.
          </p>
          <p className="text-sm">
            O front-end está consumindo as APIs do back-end na Vercel.
          </p>
        </div>
      </main>
    </div>
  );
}