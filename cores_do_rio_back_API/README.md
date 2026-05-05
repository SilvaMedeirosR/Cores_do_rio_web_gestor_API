# Cores do Rio - APIs Backend

Este diretório contém as 4 APIs serverless para deploy na Vercel.

## Estrutura

```
cores_do_rio_back_API/
├── cr_compras_api/      # API de Compras
├── cr_dep_pess_api/     # API de Departamento Pessoal
├── cr_financeiro_api/   # API Financeira
├── cr_orcamento_api/    # API de Orçamento
└── README.md
```

## Cada API contém:

- `api/index.ts` - Função serverless principal
- `package.json` - Dependências e scripts
- `tsconfig.json` - Configuração TypeScript
- `vercel.json` - Configuração de deploy na Vercel

## Como Fazer Deploy na Vercel

### Opção 1: Projetos Separados (Recomendado)

Cada API deve ser um repositório Git separado na Vercel:

1. **Para cada API, crie um repositório Git separado:**
   ```bash
   # Exemplo para API de Compras
   cd cr_compras_api
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <URL_DO_REPOSITORIO>
   git push -u origin main
   ```

2. **Na Vercel, importe cada repositório:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New Project"
   - Importe o repositório Git de cada API
   - A Vercel detectará automaticamente o `vercel.json`
   - Configure as variáveis de ambiente se necessário
   - Clique em "Deploy"

### Opção 2: Usando Vercel CLI (Desenvolvimento Local)

```bash
# Para testar localmente cada API:
cd cr_compras_api
npm install
npm run dev
# A API estará disponível em http://localhost:3000
```

### Opção 3: Deploy via CLI

```bash
# Em cada diretório de API:
cd cr_compras_api
npm install
npx vercel --prod
```

## URLs das APIs após Deploy

Após o deploy, cada API terá uma URL como:
- `https://cr-compras-api.vercel.app/`
- `https://cr-dep-pess-api.vercel.app/`
- `https://cr-financeiro-api.vercel.app/`
- `https://cr-orcamento-api.vercel.app/`

## Testando as APIs

As APIs respondem aos métodos HTTP:

- **GET**: Retorna lista de itens
- **POST**: Cria novo item (enviar JSON no body)
- **PUT**: Atualiza item existente
- **DELETE**: Remove item

## CORS

Todas as APIs estão configuradas com CORS habilitado para aceitar requisições de qualquer origem (`*`). Em produção, você pode querer restringir para domínios específicos.

## Próximos Passos

1. **Instalar dependências** em cada API:
   ```bash
   cd cr_compras_api && npm install
   cd ../cr_dep_pess_api && npm install
   cd ../cr_financeiro_api && npm install
   cd ../cr_orcamento_api && npm install
   ```

2. **Personalizar cada API** com sua lógica de negócio real e conexão com banco de dados.

3. **Configurar variáveis de ambiente** na Vercel para cada API (URLs de banco de dados, chaves de API, etc.).

4. **Fazer deploy** de cada API como projeto separado na Vercel.