// Inscrição no evento (P1): rajada de TARGET usuários ainda não inscritos em WINDOW
import { burst, thresholds } from "./lib/profiles.ts";
export { registerEvent } from "./lib/flows.ts";

export const options = {
	scenarios: { register: burst("registerEvent") },
	thresholds,
};
