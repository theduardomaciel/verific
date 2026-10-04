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
	webpack(config, { isServer }) {
		config.module.rules.push({
			test: /\.svg$/,
			use: ["@svgr/webpack"],
		});

		if (!isServer) {
			config.resolve.fallback.fs = false;
			config.resolve.fallback.tls = false;
			config.resolve.fallback.net = false;
			config.resolve.fallback.child_process = false;
		}

		return config;
	},
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
