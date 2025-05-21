export { auth as middleware } from "@verific/auth";

// Exemplo estendendo o middleware de autenticação (auth)
// import { auth } from "@ichess/auth";
/* export default auth((req) => {
	if (!req.auth && req.nextUrl.pathname !== "/login") {
		const newUrl = new URL("/login", req.nextUrl.origin)
		return Response.redirect(newUrl)
	}
}) */

export const config = {
	matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
