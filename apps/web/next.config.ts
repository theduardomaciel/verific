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
	reactCompiler: true,
	turbopack: {
		rules: {
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
