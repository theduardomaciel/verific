// Dia do evento: navegação e check-in contínuos, com as aberturas de vagas
// e de inscrições acontecendo em BURST_AT. SCALE multiplica todas as cargas.
import { PROFILE } from "./lib/config.ts";
import { burst, burstAt, scenario, thresholds } from "./lib/profiles.ts";
export { browse, checkin, joinActivity, registerEvent } from "./lib/flows.ts";

const scale = Number(__ENV.SCALE || 1);
const startTime = __ENV.BURST_AT || "1m";
const smoke = PROFILE === "smoke";

export const options = {
	scenarios: {
		browse: scenario("browse", { target: 500 * scale, fixed: true }),
		checkin: scenario("checkin", {
			target: 10 * scale,
			arrival: true,
			fixed: true,
		}),
		join: smoke
			? burst("joinActivity")
			: burstAt("joinActivity", 300 * scale, startTime),
		register: smoke
			? burst("registerEvent")
			: burstAt("registerEvent", 150 * scale, startTime),
	},
	thresholds,
};
