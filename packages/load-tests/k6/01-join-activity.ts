// Inscrição em atividade (P1): rajada de TARGET usuários em WINDOW.
// ACTIVITY=spread espalha pelas atividades de 60 vagas; ACTIVITY=form usa a atividade com formulário próprio.
import { burst, thresholds } from "./lib/profiles.ts";
export { joinActivity } from "./lib/flows.ts";

export const options = {
	scenarios: { join: burst("joinActivity") },
	thresholds,
};
