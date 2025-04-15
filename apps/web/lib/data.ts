import type { z } from "zod";
import type { getActivitiesParams } from "@verific/api/routers/activities";
import { Activity } from "./types/activity";
import { Participant } from "./types/participant";
import { Project } from "./types/project";
import { ParticipantOnActivity } from "./types/participant-on-activity";

const now = new Date();

const projects: Project[] = [
	{
		id: "1",
		name: "SECOMP 2025",
		description: "Semana de Computação 2025",
		url: "https://secomp2025.com",
		address: "Universidade Federal de Alagoas",
		hasRegistration: true,
		hasResearch: false,
		isArchived: false,
		coverUrl: "https://github.com/mauro-balades.png",
		thumbnailUrl: "https://github.com/mauro-balades.png",
		primaryColor: "#123456",
		secondaryColor: "#654321",
		startDate: new Date("2025-05-01"),
		endDate: new Date("2025-05-07"),
		createdAt: new Date("2025-01-01"),
		activities: [],
		participants: [],
		speakers: [],
	},
	{
		id: "2",
		name: "Hackathon UFAL",
		description: "Maratona de programação para resolver problemas reais",
		url: "https://hackathonufal.com",
		address: "UFAL - Campus A.C. Simões",
		hasRegistration: true,
		hasResearch: true,
		isArchived: false,
		coverUrl: "https://github.com/mauro-balades.png",
		thumbnailUrl: "https://github.com/mauro-balades.png",
		primaryColor: "#FF5733",
		secondaryColor: "#C70039",
		startDate: new Date("2025-06-15"),
		endDate: new Date("2025-06-17"),
		createdAt: new Date("2025-02-01"),
		activities: [],
		participants: [],
		speakers: [],
	},
	{
		id: "3",
		name: "Workshop de IA",
		description: "Workshop sobre Inteligência Artificial e suas aplicações",
		url: "https://workshopia.com",
		address: "UFAL - Campus Arapiraca",
		hasRegistration: false,
		hasResearch: false,
		isArchived: false,
		coverUrl: "https://github.com/mauro-balades.png",
		thumbnailUrl: "https://github.com/mauro-balades.png",
		primaryColor: "#28A745",
		secondaryColor: "#17A2B8",
		startDate: new Date("2025-07-10"),
		endDate: new Date("2025-07-12"),
		createdAt: new Date("2025-03-01"),
		activities: [],
		participants: [],
		speakers: [],
	},
];

const participants: Participant[] = [
	{
		id: "1",
		userId: "1",
		projectId: "1",
		course: "Ciência da Computação",
		registrationId: "2025001",
		period: "2025.1",
		joinedAt: new Date("2025-04-01"),
		user: {
			id: "1",
			name: "Eduardo Maciel",
			email: "eduardo@example.com",
			emailVerified: new Date("2025-01-01"),
			image_url: "https://github.com/mauro-balades.png",
			participants: [],
		},
		project: projects[0]!,
		participantsOnEvent: [],
	},
	{
		id: "2",
		userId: "2",
		projectId: "2",
		course: "Engenharia de Software",
		registrationId: "2025002",
		period: "2025.1",
		joinedAt: new Date("2025-05-01"),
		user: {
			id: "2",
			name: "Ana Silva",
			email: "ana@example.com",
			emailVerified: new Date("2025-02-01"),
			image_url: "https://github.com/mauro-balades.png",
			participants: [],
		},
		project: projects[1]!,
		participantsOnEvent: [],
	},
	{
		id: "3",
		userId: "3",
		projectId: "3",
		course: "Sistemas de Informação",
		registrationId: "2025003",
		period: "2025.1",
		joinedAt: new Date("2025-06-01"),
		user: {
			id: "3",
			name: "Carlos Souza",
			email: "carlos@example.com",
			emailVerified: new Date("2025-03-01"),
			image_url: "https://github.com/mauro-balades.png",
			participants: [],
		},
		project: projects[2]!,
		participantsOnEvent: [],
	},
	{
		id: "4",
		userId: "4",
		projectId: "1",
		course: "Análise de Sistemas",
		registrationId: "2025004",
		period: "2025.2",
		joinedAt: new Date("2025-04-15"),
		user: {
			id: "4",
			name: "Mariana Costa",
			email: "mariana@example.com",
			emailVerified: new Date("2025-03-01"),
			image_url: "https://github.com/mauro-balades.png",
			participants: [],
		},
		project: projects[0]!,
		participantsOnEvent: [],
	},
	{
		id: "5",
		userId: "5",
		projectId: "2",
		course: "Engenharia de Computação",
		registrationId: "2025005",
		period: "2025.2",
		joinedAt: new Date("2025-05-10"),
		user: {
			id: "5",
			name: "João Almeida",
			email: "joao@example.com",
			emailVerified: new Date("2025-04-01"),
			image_url: "https://github.com/mauro-balades.png",
			participants: [],
		},
		project: projects[1]!,
		participantsOnEvent: [],
	},
];

const activities: Activity[] = [
	{
		id: "1",
		name: "Palestra de Abertura",
		description: "Uma palestra inspiradora sobre o futuro da tecnologia.",
		dateFrom: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutos a partir de agora
		dateTo: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hora a partir de agora
		audience: "internal",
		category: "lecture",
		speakerId: 1,
		participantsLimit: 100,
		workload: 1.5,
		projectId: "1",
		createdAt: new Date("2025-01-01"),
		project: projects[0]!,
		speaker: {
			id: 1,
			name: "Renato Coca",
			description: "Especialista em IA",
			image_url: "https://github.com/mauro-balades.png",
			projectId: "1",
			project: projects[0]!,
			activities: [],
		},
		participantsOnActivity: [
			{
				participantId: "1",
				activityId: "1",
				role: "moderator",
				joinedAt: new Date("2025-05-01T08:50:00"),
				participant: participants[2]!,
				activity: undefined,
			},
			{
				participantId: "2",
				activityId: "2",
				role: "moderator",
				joinedAt: new Date("2025-06-15T13:50:00"),
				participant: participants[1]!,
				activity: undefined,
			},
			{
				participantId: "4",
				activityId: "1",
				role: "participant",
				joinedAt: new Date("2025-05-01T08:55:00"),
				participant: participants[3]!,
				activity: undefined,
			},
		],
	},
	{
		id: "2",
		name: "Workshop de Programação",
		description: "Aprenda a programar em Python com exemplos práticos.",
		dateFrom: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutos a partir de agora
		dateTo: new Date(now.getTime() + 3 * 60 * 1000), // 3 horas a partir de agora
		audience: "external",
		category: "workshop",
		speakerId: 2,
		participantsLimit: 50,
		workload: 3,
		projectId: "2",
		createdAt: new Date("2025-02-01"),
		project: projects[1]!,
		speaker: {
			id: 2,
			name: "Maria Clara",
			description: "Engenheira de Software",
			image_url: "https://github.com/mauro-balades.png",
			projectId: "2",
			project: projects[1]!,
			activities: [],
		},
		participantsOnActivity: [
			{
				participantId: "2",
				activityId: "2",
				role: "moderator",
				joinedAt: new Date("2025-06-15T13:50:00"),
				participant: participants[2]!,
				activity: undefined,
			},
			{
				participantId: "5",
				activityId: "2",
				role: "participant",
				joinedAt: new Date("2025-06-15T14:00:00"),
				participant: participants[4]!,
				activity: undefined,
			},
			{
				participantId: "5",
				activityId: "2",
				role: "participant",
				joinedAt: new Date("2025-06-15T14:00:00"),
				participant: participants[4]!,
				activity: undefined,
			},
			{
				participantId: "5",
				activityId: "2",
				role: "participant",
				joinedAt: new Date("2025-06-15T14:00:00"),
				participant: participants[4]!,
				activity: undefined,
			},
			{
				participantId: "5",
				activityId: "2",
				role: "participant",
				joinedAt: new Date("2025-06-15T14:00:00"),
				participant: participants[4]!,
				activity: undefined,
			},
		],
	},
	{
		id: "3",
		name: "Mesa Redonda: IA no Brasil",
		description:
			"Discussão sobre os desafios e oportunidades da IA no Brasil.",
		dateFrom: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutos a partir de agora
		dateTo: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 horas a partir de agora
		audience: "internal",
		category: "round-table",
		speakerId: 3,
		participantsLimit: 30,
		workload: 2,
		projectId: "3",
		createdAt: new Date("2025-03-01"),
		project: projects[2]!,
		speaker: {
			id: 3,
			name: "João Pedro",
			description: "Pesquisador em IA",
			image_url: "https://github.com/mauro-balades.png",
			projectId: "3",
			project: projects[2]!,
			activities: [],
		},
		participantsOnActivity: [
			{
				participantId: "3",
				activityId: "3",
				role: "moderator",
				joinedAt: new Date("2025-07-10T09:50:00"),
				participant: participants[2]!,
				activity: undefined,
			},
			{
				participantId: "1",
				activityId: "1",
				role: "moderator",
				joinedAt: new Date("2025-05-01T08:50:00"),
				participant: participants[0]!,
				activity: undefined,
			},
			{
				participantId: "1",
				activityId: "1",
				role: "moderator",
				joinedAt: new Date("2025-05-01T08:50:00"),
				participant: participants[1]!,
				activity: undefined,
			},
		],
	},
];

// This file would contain actual data fetching logic in a real application
// For now, we'll use mock data

// Sample data for filters
const categoriesData = [
	{ id: "lecture", label: "Palestra" },
	{ id: "workshop", label: "Workshop" },
	{ id: "round-table", label: "Roda de Conversa" },
	{ id: "course", label: "Curso" },
	{ id: "other", label: "Outro" },
];

const statusesData = [
	{ id: "now", label: "Acontecendo Agora" },
	{ id: "next", label: "Em Instantes" },
	// { id: "cancelado", label: "Cancelado" },
	// { id: "arquivado", label: "Arquivado" },
];

// Verifica se a atividade está ao vivo ou começando em breve
export const isLive = (date: Date): boolean => {
	return date.getTime() <= Date.now();
};
export const isStartingSoon = (date: Date): boolean => {
	return !isLive(date) && date.getTime() - Date.now() <= 5 * 60 * 1000; // 5 minutos
};
export const isToday = (date: Date): boolean => {
	return date.toDateString() === now.toDateString();
};

type GetActivitiesParams = z.infer<typeof getActivitiesParams>;

// Simulated data fetching functions with artificial delay
export async function getActivities({
	query,
	sort = "recent",
	page = 0,
	pageSize = 10,
	status = [],
	category = [],
	audience = [],
	speakerIds = [],
}: GetActivitiesParams): Promise<Activity[]> {
	// Simulate server delay
	await new Promise((resolve) => setTimeout(resolve, 500));

	// Filter activities based on parameters
	let filtered = [...activities];

	if (query) {
		filtered = filtered.filter(
			(activity) =>
				activity.name.toLowerCase().includes(query.toLowerCase()) ||
				(activity.description !== null &&
					activity.description
						.toLowerCase()
						.includes(query.toLowerCase())),
		);
	}

	if (category.length > 0) {
		filtered = filtered.filter((activity) =>
			category.includes(activity.category),
		);
	}

	// Fixing the filtering logic for statusIds
	if (status.length > 0) {
		filtered = filtered.filter((activity) => {
			if (status.includes("now") && isLive(activity.dateFrom)) {
				return true;
			}
			if (status.includes("next") && isStartingSoon(activity.dateFrom)) {
				return true;
			}
			return false;
		});
	}

	if (speakerIds.length > 0) {
		filtered = filtered.filter((activity) =>
			activity.participantsOnActivity?.some(
				(speaker) =>
					speaker.role === "moderator" &&
					speakerIds.includes(speaker.participantId),
			),
		);
	}

	// Sort activities
	if (sort === "recent") {
		filtered.sort((a, b) => Number.parseInt(b.id) - Number.parseInt(a.id));
	} else if (sort === "oldest") {
		filtered.sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id));
	} else if (sort === "alphabetical") {
		filtered.sort((a, b) => a.name.localeCompare(b.name));
	}

	// Ajustando o tipo da propriedade 'category' para corresponder ao tipo esperado
	return filtered.map((activity) => ({
		...activity,
		category: activity.category as
			| "lecture"
			| "workshop"
			| "round-table"
			| "course",
	}));
}

export async function getCategories() {
	await new Promise((resolve) => setTimeout(resolve, 50));
	return categoriesData;
}

export async function getStatuses() {
	await new Promise((resolve) => setTimeout(resolve, 50));
	return statusesData;
}

export async function getActivityDetails(
	id: string,
	{
		page = 0,
		pageSize = 10,
		general_search,
		sortBy = "recent",
	}: {
		page?: number;
		pageSize?: number;
		general_search?: string;
		sortBy?: "recent" | "oldest";
	},
): Promise<{
	activity: Activity;
	participants: ParticipantOnActivity[];
	pageCount: number;
}> {
	await new Promise((resolve) => setTimeout(resolve, 500));

	const activity = activities.find((activity) => activity.id === id);
	if (!activity) {
		throw new Error("Activity not found");
	}

	const activityParticipants =
		activity.participantsOnActivity?.filter(
			(participant) => participant.activityId === activity.id,
		) || [];

	const filteredParticipants = activityParticipants?.filter(
		(participantOnActivity) => {
			if (general_search) {
				return (
					participantOnActivity.participant?.user.name
						?.toLowerCase()
						.includes(general_search.toLowerCase()) ||
					participantOnActivity.participant.course
						?.toLowerCase()
						.includes(general_search.toLowerCase())
				);
			}
			return true;
		},
	);

	const startIndex = page * pageSize;
	const endIndex = startIndex + pageSize;
	const paginatedMembers = filteredParticipants?.slice(startIndex, endIndex);
	const pageCount = Math.ceil(filteredParticipants.length / pageSize);

	return {
		activity,
		participants: paginatedMembers,
		pageCount,
	};
}

export function formatFriendlyDate(date: Date, includeDay: boolean): string {
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();

	if (isToday) {
		return `Hoje, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
	}

	return date.toLocaleString("pt-BR", {
		month: includeDay ? "long" : undefined,
		day: includeDay ? "2-digit" : undefined,
		hour: "2-digit",
		minute: "2-digit",
	});
}
