import type { z } from "zod";
import type { getActivitiesParams } from "@verific/api/routers/activities";

const now = new Date();

export interface Activity {
	id: string;
	title: string;
	description: string;
	speaker: string;
	category: "lecture" | "workshop" | "round-table" | "mini-course";
	date: Date;
	monitors?: string[];
	participants?: number;
}

// Unificação de activitiesData com activities
export const activities = [
	{
		id: "817294",
		title: "Novo Evento",
		description:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur nulla felis, lacinia ac urna a, egestas euismod odio. Sed vestibulum dictum mi, sed euismod purus sollicitudin non. Nulla facilisis eget lectus nec imperdiet. Ut ornare est at nunc convallis vestibulum. Mor...",
		speaker: "Ângela Batista Santos",
		category: "lecture",
		date: new Date(now.getTime() + 1000 * 60 * 24 * 60 * 60), // Amanhã
		monitors: ["Eduardo", "António", "Vinícius"],
		participants: 10,
	},
	{
		id: "123",
		title: "Atividade 1",
		description: "Descrição da atividade 1",
		speaker: "Palestrante 1",
		category: "mini-course",
		date: new Date(now.getTime() + 1000 * 60 * 5), // Em 5 minutos
		monitors: ["Monitor 1", "Monitor 2"],
		participants: 10,
	},
	{
		id: "456",
		title: "Atividade 2",
		description: "Descrição da atividade 2",
		speaker: "Palestrante 2",
		category: "round-table",
		date: new Date(now.getTime()), // Agora
		monitors: ["Monitor 3"],
		participants: 20,
	},
	{
		id: "323",
		title: "Atividade 3",
		description: "Descrição da atividade 3",
		speaker: "Palestrante 3",
		category: "workshop",
		date: new Date(now.getTime() + 1000 * 60 * 5), // Em 5 minutos
		monitors: ["Monitor 3", "Monitor 2"],
		participants: 10,
	},
];

export const monitors = [
	{ id: "eduardo", name: "Eduardo Maciel", avatar: "E" },
	{ id: "renato", name: "Renato Coca", avatar: "R" },
	{ id: "gabriel", name: "Gabriel Conde", avatar: "G" },
	{ id: "antonio", name: "António Vinícius", avatar: "A" },
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

const monitorsData = [
	{ id: "eduardo", name: "Eduardo Maciel", avatar: "E" },
	{ id: "renato", name: "Renato Coca", avatar: "R" },
	{ id: "gabriel", name: "Gabriel Conde", avatar: "G" },
	{ id: "antonio", name: "António Vinícius", avatar: "A" },
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
				activity.title.toLowerCase().includes(query.toLowerCase()) ||
				activity.description.toLowerCase().includes(query.toLowerCase()),
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
			if (status.includes("now") && isLive(activity.date)) {
				return true;
			}
			if (status.includes("next") && isStartingSoon(activity.date)) {
				return true;
			}
			return false;
		});
	}

	if (speakerIds.length > 0) {
		filtered = filtered.filter((activity) =>
			activity.monitors.some((speaker) => speakerIds.includes(speaker)),
		);
	}

	// Sort activities
	if (sort === "recent") {
		filtered.sort((a, b) => Number.parseInt(b.id) - Number.parseInt(a.id));
	} else if (sort === "oldest") {
		filtered.sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id));
	} else if (sort === "name") {
		filtered.sort((a, b) => a.title.localeCompare(b.title));
	}

	// Ajustando o tipo da propriedade 'category' para corresponder ao tipo esperado
	return filtered.map((activity) => ({
		...activity,
		monitors: activity.monitors.map((monitorId) => {
			const monitor = monitorsData.find((m) => m.id === monitorId);
			return monitor ? monitor.name : monitorId;
		}),
		category: activity.category as
			| "lecture"
			| "workshop"
			| "round-table"
			| "mini-course",
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

export async function getMonitors() {
	await new Promise((resolve) => setTimeout(resolve, 50));
	return monitorsData;
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
