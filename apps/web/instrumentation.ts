export async function register() {
	const { redactQueryParams } = await import("@verific/drizzle/redact");

	// O erro de uma query que falha traz os parâmetros (tokens de sessão,
	// e-mails); todo log do servidor passa por aqui antes de sair
	for (const level of [
		"error",
		"warn",
		"info",
		"log",
		"debug",
		"trace",
	] as const) {
		const print = console[level].bind(console);
		console[level] = (...args: unknown[]) =>
			print(...args.map(redactQueryParams));
	}
}
