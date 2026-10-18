import type { NextConfig } from "next";

function storageRemotePattern() {
	const base =
		process.env.NEXT_PUBLIC_STORAGE_BASE_URL ??
		process.env.S3_PUBLIC_BASE_URL;
	if (!base) return null;
	try {
		const url = new URL(base);
		if (url.protocol !== "https:") return null;
		return {
			protocol: "https" as const,
			hostname: url.hostname,
			pathname: "/**",
		};
	} catch {
		return null;
	}
}

const storagePattern = storageRemotePattern();

const nextConfig: NextConfig = {
	cacheComponents: true,
	// Perfil custom das leituras públicas quentes (projeto, atividades,
	// formulário, perfis): vida longa + invalidação on-demand por tag.
	// `revalidate` fica como rede de segurança (24h); mudanças entram por
	// `revalidateTag(..., "max")`/`updateTag` nas mutations.
	cacheLife: {
		static: {
			stale: 3600, // 1h de cache no roteador do cliente
			revalidate: 86400, // regeneração de fundo a cada 1 dia
			expire: 604800, // teto de 7 dias sem nenhum acesso
		},
	},
	partialPrefetching: true,
	reactCompiler: true,
	experimental: {
		agentUpgrade: "latest",
		turbopackRustReactCompiler: true,
		turbopackGc: true,
		turbopackLazyDynamicImports: true,
	},
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "i.imgur.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "mail.google.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "maps.googleapis.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "cdn.jsdelivr.net",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "picsum.photos",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "*.supabase.co",
				pathname: "/**",
			},
			...(storagePattern ? [storagePattern] : []),
		],
	},
};

export default nextConfig;
