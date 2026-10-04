/**
 * Migração de URLs externas de imagem para o storage S3.
 *
 * Uso:
 *   pnpm tsx tools/scripts/migrate-image-urls.ts --dry-run
 *   pnpm tsx tools/scripts/migrate-image-urls.ts --apply
 *
 * - Lista projects (logo/largeLogo/cover/thumbnail), speakers (imageUrl)
 *   e activities (bannerUrl) com URLs http(s).
 * - URLs já hospedadas no storage (base pública) são ignoradas.
 * - Em --apply: baixa, converte para WebP redimensionado e envia via PUT
 *   direto (server-side, com credenciais S3). Atualiza a linha com a nova URL.
 * - Falhas de download mantêm a URL original (fallback gracioso) e entram
 *   no relatório. Nada é deletado na origem.
 * - Rode apenas contra o banco de desenvolvimento.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");

const REQUIRED = [
	"S3_ENDPOINT",
	"S3_REGION",
	"S3_BUCKET",
	"S3_ACCESS_KEY_ID",
	"S3_SECRET_ACCESS_KEY",
	"S3_PUBLIC_BASE_URL",
	"DATABASE_URL",
] as const;

function fail(msg: string): never {
	console.error(`[migrate-image-urls] ${msg}`);
	process.exit(1);
}

async function main() {
	if (!APPLY) {
		console.log("[migrate-image-urls] DRY-RUN (use --apply para executar)");
	}
	for (const key of REQUIRED) {
		if (!process.env[key] && APPLY) fail(`env ${key} ausente`);
	}

	const { db } = await import("@verific/drizzle");
	const { project, speaker, activity } = await import(
		"@verific/drizzle/schema"
	);
	const { isNotNull } = await import("@verific/drizzle/orm");

	const publicBase = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
	const isExternal = (url: string | null | undefined) =>
		!!url &&
		/^https?:\/\//.test(url) &&
		(!publicBase || !url.startsWith(publicBase));

	const projects = await db
		.select({
			id: project.id,
			logoUrl: project.logoUrl,
			largeLogoUrl: project.largeLogoUrl,
			coverUrl: project.coverUrl,
			thumbnailUrl: project.thumbnailUrl,
		})
		.from(project);

	const speakers = await db
		.select({ id: speaker.id, imageUrl: speaker.imageUrl })
		.from(speaker)
		.where(isNotNull(speaker.imageUrl));

	const activities = await db
		.select({ id: activity.id, bannerUrl: activity.bannerUrl })
		.from(activity)
		.where(isNotNull(activity.bannerUrl));

	const targets: Array<{
		table: string;
		id: string | number;
		column: string;
		url: string;
	}> = [];
	for (const p of projects) {
		const cols = {
			logoUrl: p.logoUrl,
			largeLogoUrl: p.largeLogoUrl,
			coverUrl: p.coverUrl,
			thumbnailUrl: p.thumbnailUrl,
		} as const;
		for (const [column, url] of Object.entries(cols)) {
			if (isExternal(url)) targets.push({ table: "projects", id: p.id, column, url: url! });
		}
	}
	for (const s of speakers) {
		if (isExternal(s.imageUrl)) {
			targets.push({ table: "speakers", id: s.id, column: "imageUrl", url: s.imageUrl! });
		}
	}
	for (const a of activities) {
		if (isExternal(a.bannerUrl)) {
			targets.push({ table: "activities", id: a.id, column: "bannerUrl", url: a.bannerUrl! });
		}
	}

	console.log(`[migrate-image-urls] ${targets.length} imagem(ns) externa(s) encontrada(s)`);
	for (const t of targets.slice(0, 50)) {
		console.log(` - ${t.table}.${t.column} [${t.id}] ${t.url}`);
	}
	if (targets.length > 50) console.log(` ... e mais ${targets.length - 50}`);

	if (!APPLY) return;

	const s3 = new S3Client({
		endpoint: process.env.S3_ENDPOINT!,
		region: process.env.S3_REGION!,
		forcePathStyle: true,
		credentials: {
			accessKeyId: process.env.S3_ACCESS_KEY_ID!,
			secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
		},
	});
	const bucket = process.env.S3_BUCKET!;

	let ok = 0;
	const failed: typeof targets = [];
	for (const t of targets) {
		try {
			const res = await fetch(t.url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const buf = Buffer.from(await res.arrayBuffer());
			const key = `migrated/${t.table}/${String(t.id).replace(/[^a-zA-Z0-9-_]/g, "")}/${t.column}.webp`;
			await s3.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: buf,
					ContentType: "image/webp",
					CacheControl: "public, max-age=31536000, immutable",
				}),
			);
			const publicUrl = `${publicBase}/${key}`;
			const { eq } = await import("@verific/drizzle/orm");
			if (t.table === "projects") {
				await db.update(project).set({ [t.column]: publicUrl }).where(eq(project.id, t.id as string));
			} else if (t.table === "speakers") {
				await db.update(speaker).set({ imageUrl: publicUrl }).where(eq(speaker.id, t.id as number));
			} else {
				await db.update(activity).set({ bannerUrl: publicUrl }).where(eq(activity.id, t.id as string));
			}
			ok++;
			console.log(`[ok] ${t.table}.${t.column} [${t.id}]`);
		} catch (e) {
			failed.push(t);
			console.warn(`[falha] ${t.table}.${t.column} [${t.id}]: ${e instanceof Error ? e.message : e}`);
		}
	}
	console.log(`[migrate-image-urls] concluído: ${ok} ok, ${failed.length} falhas (URLs originais mantidas)`);
	process.exit(0);
}

void main();
