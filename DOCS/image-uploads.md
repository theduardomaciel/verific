# Uploads de imagem (Fase 1)

## Provedor

Adapter S3 genérico (`packages/api/lib/storage.ts`) via `S3_*` env.
Alvo inicial: **Supabase Storage (endpoint S3)** — um fornecedor a menos
(Postgres já é Supabase). Fallback definitivo: **Cloudflare R2** se o spike
mostrar incompatibilidade (path-style, presigned PUT, CORS, cache headers).

Env (todas opcionais; sem elas o upload falha com mensagem clara em pt-BR):

```
S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3
S3_REGION=auto
S3_BUCKET=verific-images
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://<ref>.supabase.co/storage/v1/object/public/verific-images
S3_FORCE_PATH_STYLE=true
NEXT_PUBLIC_STORAGE_BASE_URL=<mesmo que S3_PUBLIC_BASE_URL>
```

## Fluxo

1. `ImageUploader` (client) → `processImageFile` (canvas: resize por finalidade,
   rasteriza SVG → WebP, remove EXIF) → `trpc.requestImageUpload`
   (protegido; confere dono/moderador do evento; valida tipo/tamanho).
2. Server retorna presigned PUT (300s) + URL pública.
3. Client faz `PUT` direto no storage (não passa pelo Next).
4. Sucesso → salva a URL pública no campo existente (`logoUrl`, `coverUrl`,
   `thumbnailUrl`, `speaker.imageUrl`). Troca remove o objeto antigo;
   "Remover" também remove. Falhas de delete são best-effort.

## Finalidades e máximos

| purpose | máx | teto |
|---|---|---|
| event-logo | 512×512 | 512KB |
| event-logo-wide | 1024×512 | 512KB |
| event-cover | 1920×1080 | 1MB |
| event-thumbnail | 1200×630 | 512KB |
| speaker | 800×800 | 512KB |
| activity-banner | 1600×900 | 1MB |

Saída sempre `image/webp`, `Cache-Control: public, max-age=31536000, immutable`.
SVG de entrada é rasterizado (decisão Fase 0: sem SVG hospedado, sem XSS).

## Campos migrados

- `projects.logoUrl/largeLogoUrl/coverUrl/thumbnailUrl` (4 inputs → uploader)
- `speakers.imageUrl` (dialog → uploader)
- `activities.bannerUrl`: sem UI atual; script de migração já cobre a coluna
- `templates.logos`: sem UI atual; fora do escopo, pronto para migrar depois
- Foto de perfil do participante: **não** é upload (Google/GitHub, Fase 4)

## Migração de URLs legadas

`apps/web/tools/scripts/migrate-image-urls.ts`:

```
pnpm tsx tools/scripts/migrate-image-urls.ts --dry-run  # lista (seguro)
pnpm tsx tools/scripts/migrate-image-urls.ts --apply    # DEV apenas
```

Re-hospeda o alcançável, mantém o inalcançável (fallback `hero-bg.png`/
`cover.png` continua valendo). Nada é apagado na origem.

## Cache e CLS

`next.config.ts` libera `*.supabase.co` + `NEXT_PUBLIC_STORAGE_BASE_URL`.
`ImageUploader` usa `next/image fill + sizes`; páginas usam dimensões fixas —
sem novo CLS. Dimensões por objeto serão persistidas na Fase 2 (theme keys).
