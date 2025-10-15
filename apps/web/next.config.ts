import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	webpack(config) {
		config.module.rules.push({
			test: /\.svg$/,
			use: ["@svgr/webpack"],
		});

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
		],
	},
};

export default nextConfig;
