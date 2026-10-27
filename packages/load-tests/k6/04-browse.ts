// Navegação pública (P2)
import { scenario, thresholds } from "./lib/profiles.ts";
export { browse } from "./lib/flows.ts";

export const options = {
	scenarios: { browse: scenario("browse", { target: 1000 }) },
	thresholds,
};
