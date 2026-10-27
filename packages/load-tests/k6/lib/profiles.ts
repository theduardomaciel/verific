import { PROFILE } from "./config.ts";

import type { Options, Scenario } from "k6/options";

const envTarget = (fallback: number) =>
	__ENV.TARGET ? Number(__ENV.TARGET) : fallback;

// Fluxos em que cada usuário age uma vez: `target` usuários chegam
// ao longo de WINDOW e cada um faz a jornada uma única vez.
// O estresse vem de repetir a rajada com tamanhos crescentes (bursts.ts).
export function burst(
	exec: string,
	{ target = envTarget(1000) }: { target?: number } = {},
): Scenario {
	if (PROFILE === "smoke") {
		return { executor: "shared-iterations", exec, vus: 1, iterations: 1 };
	}
	if (PROFILE !== "burst") {
		throw new Error(
			`Este fluxo aceita PROFILE=smoke ou burst, não ${PROFILE}`,
		);
	}
	return burstAt(exec, target);
}

export function burstAt(
	exec: string,
	target: number,
	startTime?: string,
): Scenario {
	const window = __ENV.WINDOW || "10s";
	return {
		executor: "constant-arrival-rate",
		exec,
		rate: target,
		timeUnit: window,
		duration: window,
		preAllocatedVUs: target,
		maxVUs: target,
		...(startTime && { startTime }),
		// Deixa as jornadas lentas terminarem em vez de interrompê-las
		gracefulStop: "2m",
		// O executor pode disparar uma iteração a mais no fim da janela
		env: { BURST_SIZE: String(target) },
	};
}

// Converte PROFILE (smoke, load, stress, spike, soak) num cenário do k6.
// `target` = VUs simultâneos ou, com `arrival`, requisições por segundo.
export function scenario(
	exec: string,
	{
		target: defaultTarget,
		arrival = false,
		fixed = false,
	}: { target: number; arrival?: boolean; fixed?: boolean },
): Scenario {
	const target = fixed ? defaultTarget : envTarget(defaultTarget);

	if (PROFILE === "smoke") {
		return { executor: "shared-iterations", exec, vus: 1, iterations: 1 };
	}

	const stages = (
		{
			load: [
				{ duration: "1m", target },
				{ duration: "3m", target },
				{ duration: "30s", target: 0 },
			],
			// Degraus de 10%, 20%, 50%, 100% e 150% do alvo, STEP (padrão 2m) cada
			stress: [0.1, 0.2, 0.5, 1, 1.5]
				.flatMap((f) => [
					{ duration: "30s", target: Math.round(target * f) },
					{
						duration: __ENV.STEP || "2m",
						target: Math.round(target * f),
					},
				])
				.concat({ duration: "30s", target: 0 }),
			spike: [
				{ duration: "10s", target },
				{ duration: "1m", target },
				{ duration: "10s", target: 0 },
			],
			soak: [
				{ duration: "2m", target },
				{ duration: __ENV.DURATION || "30m", target },
				{ duration: "1m", target: 0 },
			],
		} as Record<string, { duration: string; target: number }[]>
	)[PROFILE];

	if (!stages) throw new Error(`PROFILE desconhecido: ${PROFILE}`);

	if (arrival) {
		return {
			executor: "ramping-arrival-rate",
			exec,
			startRate: 0,
			timeUnit: "1s",
			preAllocatedVUs: Math.max(10, target * 2),
			maxVUs: Math.max(50, target * 20),
			stages,
		};
	}
	return { executor: "ramping-vus", exec, startVUs: 0, stages };
}

// Critérios do plano: o limite de um fluxo é o primeiro degrau em que algum falha
export const thresholds: Options["thresholds"] = {
	"http_req_duration{flow:join}": ["p(95)<1000"],
	"http_req_duration{flow:register}": ["p(95)<1000"],
	"http_req_duration{flow:checkin}": ["p(95)<1000"],
	"http_req_duration{flow:browse}": ["p(95)<1500"],
	"http_req_duration{name:get-session}": ["p(95)<300"],
	http_req_failed: ["rate<0.01"],
	checks: ["rate>0.99"],
};
