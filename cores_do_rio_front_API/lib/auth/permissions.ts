export type Funcao =
  | "orcamentista"
  | "rh"
  | "financeiro"
  | "materiais"
  | "gerencia_financeira"
  | "desenvolvedor"
  | "titular";

/** Rota inicial de cada função após login */
export const FUNCAO_HOME: Record<Funcao, string> = {
  orcamentista:        "/orcamentos",
  rh:                  "/departamento-pessoal",
  financeiro:          "/financeiro",
  materiais:           "/compras",
  gerencia_financeira: "/financeiro",
  desenvolvedor:       "/",
  titular:             "/metricas",
};

/**
 * Prefixos de rotas protegidas e quais funções têm acesso.
 * Lista vazia = ninguém acessa.
 */
export const ROUTE_PERMISSIONS: { prefix: string; allowed: Funcao[] }[] = [
  { prefix: "/orcamentos",           allowed: ["orcamentista"]                          },
  { prefix: "/departamento-pessoal", allowed: ["rh"]                                    },
  { prefix: "/financeiro",           allowed: ["financeiro", "gerencia_financeira"]      },
  { prefix: "/compras",              allowed: ["materiais"]                              },
  { prefix: "/metricas",             allowed: ["titular"]                                },
];

/** Retorna true se a função tem acesso ao pathname. */
export function temAcesso(funcao: Funcao, pathname: string): boolean {
  if (funcao === "desenvolvedor") return true;
  const regra = ROUTE_PERMISSIONS.find(r => pathname.startsWith(r.prefix));
  if (!regra) return true; // rota não listada = livre (ex: /)
  return (regra.allowed as string[]).includes(funcao);
}

/** Rota home da função, com fallback para /. */
export function rotaHome(funcao: string): string {
  return FUNCAO_HOME[funcao as Funcao] ?? "/";
}
