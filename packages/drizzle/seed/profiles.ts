import type { ActivitySpec, EventSpec } from "./seed-event";

export interface SeedProfile {
	users: number;
	events: EventSpec[];
}

const randomActivities = (count: number): ActivitySpec[] =>
	Array.from({ length: count }, () => ({}));

// Nomes usados pelos testes de carga para localizar o cenário
export const STRESS_EVENT = {
	url: "seed-stress",
	activities: {
		limit50: "Estresse: limite 50",
		limit100: (n: number) => `Estresse: limite 100 (${n})`,
		checkin: "Estresse: check-in",
	},
	limit100Count: 10,
} as const;

export const profiles = {
	light: {
		users: 30,
		events: [
			{
				startsInDays: 14,
				durationDays: 5,
				participants: 15,
				monitors: 2,
				moderators: 1,
				speakers: 6,
				activities: randomActivities(20),
			},
			{
				startsInDays: -1,
				durationDays: 4,
				participants: 15,
				monitors: 2,
				moderators: 1,
				speakers: 6,
				activities: randomActivities(20),
			},
		],
	},
	default: {
		users: 400,
		events: [
			{
				startsInDays: 14,
				durationDays: 5,
				participants: 250,
				monitors: 5,
				moderators: 2,
				speakers: 15,
				activities: randomActivities(60),
			},
			{
				startsInDays: -1,
				durationDays: 4,
				participants: 200,
				monitors: 5,
				moderators: 2,
				speakers: 10,
				activities: randomActivities(50),
			},
		],
	},
	// Cenário dos testes de estresse: 1500 inscritos + 20 monitores no evento
	// e 1500 usuários ainda não inscritos
	stress: {
		users: 3020,
		events: [
			{
				name: "Evento de Estresse",
				url: STRESS_EVENT.url,
				startsInDays: 7,
				durationDays: 3,
				participants: 1520,
				monitors: 20,
				moderators: 0,
				speakers: 10,
				activities: [
					{
						name: STRESS_EVENT.activities.limit50,
						participantsLimit: 50,
						sessions: 1,
						enrolled: 0,
						monitors: 0,
					},
					...Array.from(
						{ length: STRESS_EVENT.limit100Count },
						(_, i) => ({
							name: STRESS_EVENT.activities.limit100(i + 1),
							participantsLimit: 100,
							sessions: 1,
							enrolled: 0,
							monitors: 0,
						}),
					),
					{
						name: STRESS_EVENT.activities.checkin,
						participantsLimit: null,
						sessions: 1,
						enrolled: "all",
						monitors: "all",
					},
					...randomActivities(40),
				],
			},
		],
	},
} satisfies Record<string, SeedProfile>;

export type ProfileName = keyof typeof profiles;
