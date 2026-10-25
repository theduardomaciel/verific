// Os parâmetros fecham a mensagem do `DrizzleQueryError` e podem ter quebras
// de linha
const PARAMS = /\nparams: [\s\S]*$/;
const QUERY_PREFIX = "Failed query: ";
// O erro do Postgres repete valores em `detail` (ex.: "Key (email)=(...)")
const VALUE_FIELDS = ["params", "detail", "where"];

/** O erro e as suas causas. */
function collectErrors(value: unknown) {
	const errors: Error[] = [];
	for (
		let error: unknown = value;
		error instanceof Error && errors.length < 5;
		error = error.cause
	) {
		errors.push(error);
	}
	return errors;
}

/**
 * Se o erro (ou uma causa) é de uma query que falhou. Pela mensagem, e não
 * por `instanceof`: o Next empacota rotas e instrumentation em separado, cada
 * uma com a sua cópia de `DrizzleQueryError`.
 */
export function isQueryError(value: unknown) {
	return collectErrors(value).some((error) =>
		error.message.includes(QUERY_PREFIX),
	);
}

// Escreve sem lançar: há erros com campos só de leitura (ex.: DOMException)
function overwrite(error: Error, field: string, value: unknown) {
	try {
		(error as unknown as Record<string, unknown>)[field] = value;
	} catch {
		// Campo só de leitura: fica como está
	}
}

/**
 * Tira dos logs os valores das queries que falharam: o `DrizzleQueryError`
 * põe os parâmetros na mensagem e no campo `params`, e eles podem ter tokens
 * de sessão e dados pessoais. Só mexe em valores que trazem uma query
 * (alterando os erros no lugar); o resto passa como está.
 */
export function redactQueryParams<T>(value: T): T {
	if (typeof value === "string") {
		return (
			value.includes(QUERY_PREFIX) ? value.replace(PARAMS, "") : value
		) as T;
	}
	const errors = collectErrors(value);
	if (!errors.some((error) => error.message.includes(QUERY_PREFIX))) {
		return value;
	}
	for (const error of errors) {
		if (error.message.includes(QUERY_PREFIX)) {
			const message = error.message.replace(PARAMS, "");
			if (error.stack) {
				overwrite(
					error,
					"stack",
					error.stack.replace(error.message, () => message),
				);
			}
			overwrite(error, "message", message);
		}
		for (const field of VALUE_FIELDS) {
			if (field in error) overwrite(error, field, "[omitido]");
		}
	}
	return value;
}
