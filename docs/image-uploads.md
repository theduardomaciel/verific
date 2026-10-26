# Uploads de imagem

## Provedor

Adapter S3 genérico (`packages/api/lib/storage.ts`) via `S3_*` env: qualquer
serviço compatível com presigned PUT e CORS, como Supabase Storage ou
Cloudflare R2. O exemplo abaixo usa o endpoint S3 do Supabase.

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
   rasteriza SVG, remove EXIF; logo em PNG, demais em WebP) →
   `trpc.requestImageUpload`
   (protegido; confere dono/moderador do evento; valida tipo/tamanho).
2. Server retorna presigned PUT (300s) + URL pública.
3. Client faz `PUT` direto no storage (não passa pelo Next).
4. Sucesso → o formulário guarda a URL pública no campo (`logoUrl`,
   `coverUrl`, `thumbnailUrl`, `speaker.imageUrl`, arte do crachá). A
   imagem substituída ou removida só sai do storage quando o formulário é
   salvo (`updateProject`, `updateSpeaker`, `saveLayout`, via
   `lib/image-cleanup.ts`); falhas no delete deixam um objeto órfão.

## Finalidades e máximos

| purpose         | máx       | teto  |
| --------------- | --------- | ----- |
| event-logo      | 512×512   | 512KB |
| event-logo-wide | 768×384   | 512KB |
| event-cover     | 1920×1080 | 1MB   |
| event-thumbnail | 1200×630  | 512KB |
| speaker         | 512×512   | 512KB |
| activity-banner | 1600×900  | 1MB   |
| badge-artwork   | original  | 5MB   |

`event-logo` e `event-logo-wide` saem em **PNG lossless** (alpha preservado,
e-mail-safe: o Gmail recomprime WebP com perdas e achata o alpha; o Outlook
desktop não renderiza WebP). Se o PNG passar de ~400KB, cai para WebP com
aviso no console. As demais finalidades saem em `image/webp`.
`badge-artwork` vai como está (PNG, JPEG ou PDF), sem redimensionar, para
manter a nitidez na impressão; SVG é rasterizado a ≥300dpi antes do envio.
`Cache-Control: public, max-age=31536000, immutable`. SVG de entrada é
sempre rasterizado: nenhum SVG fica hospedado, sem risco de XSS.

## Campos migrados

- `projects.logoUrl/largeLogoUrl/coverUrl/thumbnailUrl` (4 inputs → uploader)
- `speakers.imageUrl` (dialog → uploader)
- `activities.bannerUrl`: sem UI atual; script de migração já cobre a coluna
- `templates.logos`: sem UI atual; fora do escopo, pronto para migrar depois
- Foto de perfil do participante: **não** é upload (vem da conta Google)

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
`ImageUploader` usa `next/image fill + sizes`; páginas usam dimensões fixas,
sem novo CLS. As dimensões dos logos são gravadas no upload
(`lib/images/logo-dims.ts`), e o cabeçalho reserva o espaço certo.
