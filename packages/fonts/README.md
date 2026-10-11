# @verific/fonts

Catálogo estático de Google Fonts + helpers compartilhados (servidor e editor).

## Estrutura

- `index.ts` (raiz) — **leve**: tipos + helpers puros, sem dados. É o único
  módulo que páginas públicas de eventos podem importar (não aumenta o bundle).
- `catalog.ts` — catálogo completo (`catalog.json`) + `getFont`/`hasFont`.
  **Servidor e editor apenas** (no editor, via `import()` preguiçoso).
- `validation.ts` — schema zod da seleção contra o catálogo. **Servidor apenas**.
- `catalog.json` — dados estáticos comprometidos (semente curada; ver abaixo).
- `scripts/generate-font-catalog.ts` — regenera o catálogo (top 500).

## Regenerar o catálogo

A Google Fonts Developer API exige uma chave **somente para o script**
(nunca em runtime):

```sh
GOOGLE_FONTS_API_KEY=... pnpm --filter @verific/fonts generate-catalog
```

A chave é lida nesta ordem (a primeira que existir vale; `dotenv` nunca
sobrescreve o ambiente): variável de ambiente do shell, `.env` na raiz do
repo, `packages/fonts/.env` (mesma convenção `dotenv/config` de
`packages/drizzle/migrate.ts`). Nenhum `.env` é commitado (`.gitignore`
global). Chave gratuita em
<https://console.cloud.google.com/apis/library/webfonts.googleapis.com>.
O catálogo comprometido é limitado às ~500 fontes mais populares.

## Licenças

As fontes listadas usam licenças abertas (OFL na semente curada — permite
self-hosting, usado na Fase 5). O campo `license` por fonte é preservado pelo
script quando a API informa; revise antes de republicar.
