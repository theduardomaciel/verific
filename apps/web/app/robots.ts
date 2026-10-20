import type { MetadataRoute } from "next";

/**
 * Robôs de busca não têm o que fazer em rotas de sessão/dashboard: cada
 * visita é uma invocação de função com leitura de sessão. Páginas
 * públicas (evento, programação, perfis) seguem abertas — o `allow: "/"`
 * explícito evita que o default seja sobrescrito por regra de terceiros.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/api", "/dashboard", "/account", "/auth", "/dev"],
		},
	};
}
