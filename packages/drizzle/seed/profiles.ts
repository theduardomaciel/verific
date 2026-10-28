import type { ActivitySpec, EventSpec } from "./seed-event";

export interface SeedProfile {
	users: number;
	events: EventSpec[];
}

const randomActivities = (count: number): ActivitySpec[] =>
	Array.from({ length: count }, () => ({}));

// As atividades aleatórias terminam até as 21h. Às 21h do último dia, ninguém
// do seed está ocupado, então a inscrição dos testes de carga não esbarra em
// conflito de horário.
const STRESS_JOIN_SLOT = { day: 2, startHour: 21, hours: 1 };

// Atividade longa, como uma maratona, que não conflita com as outras
const OVERLAPPING_ACTIVITY: ActivitySpec = {
	allowOverlap: true,
	sessions: 1,
	slot: { day: 1, startHour: 8, hours: 10 },
};

// Nomes usados pelos testes de carga para localizar o cenário
export const STRESS_EVENT = {
	url: "seed-stress",
	activities: {
		limit50: "Estresse: limite 50",
		spread: (n: number) => `Estresse: espalhada (${n})`,
		withForm: "Estresse: com formulário",
		checkin: "Estresse: check-in",
	},
	spreadCount: 5,
} as const;

export const profiles = {
	minimal: {
		users: 5,
		events: [
			{
				startsInDays: 14,
				durationDays: 3,
				participants: 3,
				monitors: 1,
				moderators: 1,
				speakers: 1,
				activities: [
					{
						participantsLimit: 10,
					},
				],
			},
		],
	},
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
				activities: [
					{
						participantsLimit: 8,
						waitlist: { waiting: 3, offered: 1 },
					},
					...randomActivities(18),
					OVERLAPPING_ACTIVITY,
				],
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
				activities: [
					{
						participantsLimit: 20,
						waitlist: { waiting: 5, offered: 1 },
					},
					{ participantsLimit: 15, waitlist: { waiting: 3 } },
					...randomActivities(57),
					OVERLAPPING_ACTIVITY,
				],
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
	// Cenário para exercitar perfil, ranking, adesivos e checkout no dev.
	// O evento começou há 2 dias (3 dias já "aconteceram"), então há
	// check-ins diários, sessões concluídas e ranking com pontos.
	gamification: {
		users: 30,
		events: [
			{
				name: "Evento Gamificado",
				url: "seed-gamification",
				startsInDays: -2,
				durationDays: 5,
				participants: 12,
				monitors: 2,
				moderators: 1,
				speakers: 3,
				activities: [
					{
						name: "Abertura",
						participantsLimit: 20,
						enrolled: "all",
						sessions: 1,
						slot: { day: 0, startHour: 8, hours: 3 },
					},
					{
						name: "Oficina prática",
						participantsLimit: 20,
						enrolled: "all",
						sessions: 1,
						slot: { day: 0, startHour: 11, hours: 3 },
					},
					{
						name: "Mesa de encerramento",
						participantsLimit: 20,
						enrolled: "all",
						sessions: 1,
						slot: { day: 0, startHour: 15, hours: 3 },
					},
				],
				gamification: { enabled: true, checkout: true },
			},
		],
	},
	// Cenário dos testes de estresse: 1500 inscritos + 20 monitores no evento
	// e 1500 usuários ainda não inscritos
	// Dimensionado pela Secomp (~450 participantes, ~30 atividades): 450
	// inscritos + 20 monitores no evento e 450 usuários ainda não inscritos
	stress: {
		users: 920,
		events: [
			{
				name: "Evento de Estresse",
				url: STRESS_EVENT.url,
				startsInDays: 7,
				durationDays: 3,
				participants: 470,
				monitors: 20,
				moderators: 0,
				speakers: 10,
				activities: [
					{
						name: STRESS_EVENT.activities.limit50,
						participantsLimit: 50,
						sessions: 1,
						slot: STRESS_JOIN_SLOT,
						enrolled: 0,
						monitors: 0,
					},
					// 300 vagas para 450 pessoas: a disputa espalhada também esgota
					...Array.from(
						{ length: STRESS_EVENT.spreadCount },
						(_, i) => ({
							name: STRESS_EVENT.activities.spread(i + 1),
							participantsLimit: 60,
							sessions: 1,
							slot: STRESS_JOIN_SLOT,
							enrolled: 0,
							monitors: 0,
						}),
					),
					{
						name: STRESS_EVENT.activities.withForm,
						participantsLimit: 50,
						sessions: 1,
						slot: STRESS_JOIN_SLOT,
						enrolled: 0,
						monitors: 0,
						form: true,
					},
					{
						name: STRESS_EVENT.activities.checkin,
						participantsLimit: null,
						sessions: 1,
						slot: { day: 0, startHour: 8, hours: 2 },
						enrolled: "all",
						monitors: "all",
					},
					...randomActivities(22),
				],
			},
		],
	},
} satisfies Record<string, SeedProfile>;

export type ProfileName = keyof typeof profiles;
