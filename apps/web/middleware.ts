export { auth as middleware } from "@verific/auth";

export const config = {
	matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
