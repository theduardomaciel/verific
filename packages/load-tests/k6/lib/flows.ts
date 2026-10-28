import { check, sleep } from "k6";
import exec from "k6/execution";
import { Counter } from "k6/metrics";

import { Client, trpcError, trpcReason } from "./client.ts";
import { enrolled, event, monitors, newcomers } from "./data.ts";

type User = { userId: string; cookie: string };

// Jornadas do navegador para cada fluxo. Cada página repete o que o front
// faz depois do HTML: as queries públicas e, para quem tem sessão,
// get-session e as queries do usuário. Páginas estáticas não chamam nada.

const joinOutcomes = new Counter("join_outcomes");

const think = (min: number, max: number) =>
	sleep(min + Math.random() * (max - min));
const pick = <T>(list: ArrayLike<T>): T =>
	list[Math.floor(Math.random() * list.length)]!;
const projectUrl = event.url;
const projectId = event.projectId;

// Um usuário diferente por iteração; null quando a lista ou a rajada acabam
const nextUser = <T>(list: ArrayLike<T>): T | null => {
	const index = exec.scenario.iterationInTest;
	if (index >= Number(__ENV.BURST_SIZE || Infinity)) return null;
	return list[index] || null;
};

// Sessão e estado de inscrição: o que toda página do evento busca para quem está logado
function loadMembership(client: Client, user: User, flow: string) {
	client.getSession(flow);
	client.query(
		{
			getMyEnrollmentState: {
				projectUrl,
				clientSessionId: user.userId,
			},
		},
		{ flow },
	);
}

function loadActivityPage(client: Client, activityId: string, flow: string) {
	client.query(
		{
			getActivityAvailability: { projectId, activityIds: [activityId] },
			getPublishedForm: { projectId, activityId },
		},
		{ flow },
	);
}

// ACTIVITY=spread espalha a disputa pelas atividades de 60 vagas;
// ACTIVITY=form usa a atividade com formulário próprio
function joinTarget(): string {
	const { activities } = event;
	if (__ENV.ACTIVITY === "spread") {
		const i = exec.scenario.iterationInTest % activities.spread.length;
		return activities.spread[i]!;
	}
	if (__ENV.ACTIVITY === "form") return activities.withForm;
	return activities.limit50;
}

export function joinActivity() {
	const user = nextUser(enrolled);
	if (!user) return;

	const activityId = joinTarget();
	const withForm = activityId === event.activities.withForm;

	const client = new Client(user.cookie);
	client.page(`/${projectUrl}/schedule/${activityId}`, {
		flow: "join",
		label: "/[evento]/schedule/[atividade]",
	});
	loadActivityPage(client, activityId, "join");
	loadMembership(client, user, "join");
	client.query(
		{
			getMyWaitlistEntries: { projectUrl },
			getActivitiesFromParticipant: { projectUrl },
		},
		{ flow: "join" },
	);
	think(0.5, 2);

	const res = client.mutation(
		"addActivityParticipants",
		{
			activityId,
			participantsIdsToAdd: [user.participantId],
			// Como o navegador: respostas do formulário próprio da atividade
			...(withForm && {
				formAnswers: { answers: event.activityFormAnswers },
			}),
		},
		{ flow: "join", expected: [200, 400] },
	);
	const reason = trpcReason(res);
	const outcome = !trpcError(res)
		? "inscrito"
		: reason === "ACTIVITY_FULL"
			? "esgotado"
			: "erro";
	joinOutcomes.add(1, { outcome, reason: reason || "" });
	check(res, {
		"inscrição em atividade respondida": () => outcome !== "erro",
	});
}

export function registerEvent() {
	const user = nextUser(newcomers);
	if (!user) return;

	const client = new Client(user.cookie);
	client.page(`/${projectUrl}/subscribe`, {
		flow: "register",
		label: "/[evento]/subscribe",
	});
	loadMembership(client, user, "register");
	think(3, 8); // preenchendo o formulário

	// Respostas montadas a partir do formulário publicado (`pnpm sessions`)
	const res = client.mutation(
		"submitAnswers",
		{
			projectId,
			name: "Participante de Carga",
			answers: event.registrationAnswers,
		},
		{ flow: "register" },
	);
	check(res, {
		"inscrição no evento ok": (r) => r.status === 200 && !trpcError(r),
	});
}

// Cada VU é um monitor com o leitor aberto: mantém a sessão entre leituras
let monitorClient: Client | null = null;

export function checkin() {
	if (!monitorClient) {
		const monitor = monitors[(exec.vu.idInTest - 1) % monitors.length]!;
		monitorClient = new Client(monitor.cookie);
		monitorClient.getSession("checkin");
	}

	// ~20% de releituras do mesmo crachá
	const participant =
		Math.random() < 0.2
			? enrolled[Math.floor(Math.random() * 50)]!
			: pick(enrolled);

	// O QR do crachá carrega o shortId do participante
	const res = monitorClient.mutation(
		"updateSessionPresence",
		{
			sessionId: event.activities.checkinSession,
			code: participant.shortId,
		},
		{ flow: "checkin" },
	);
	check(res, { "check-in ok": (r) => r.status === 200 && !trpcError(r) });
}

// 70% anônimos, 30% logados: página do evento → programação → atividade
export function browse() {
	const user = Math.random() < 0.3 ? pick(enrolled) : null;
	const client = new Client(user && user.cookie);
	const activityId = pick(event.activities.others);

	// Estática: nenhuma chamada depois do HTML
	client.page(`/${projectUrl}`, { flow: "browse", label: "/[evento]" });
	think(1, 3);

	client.page(`/${projectUrl}/schedule`, {
		flow: "browse",
		label: "/[evento]/schedule",
		rsc: true,
	});
	client.query(
		{
			getActivityAvailability: {
				projectId,
				activityIds: event.activities.all,
			},
		},
		{ flow: "browse" },
	);
	if (user) {
		loadMembership(client, user, "browse");
		client.query(
			{ getMyWaitlistEntries: { projectUrl } },
			{ flow: "browse" },
		);
	}
	think(1, 3);

	// Navegação client-side: sessão, estado e fila continuam em cache
	client.page(`/${projectUrl}/schedule/${activityId}`, {
		flow: "browse",
		label: "/[evento]/schedule/[atividade]",
		rsc: true,
	});
	loadActivityPage(client, activityId, "browse");
	if (user) {
		client.query(
			{ getActivitiesFromParticipant: { projectUrl } },
			{ flow: "browse" },
		);
	}
	think(1, 3);
}
