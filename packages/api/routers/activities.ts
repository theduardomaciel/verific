import { z } from "zod";
import { transformSingleToArray } from "../utils";
import { activityCategories, activityAudiences } from "@verific/drizzle/schema";

export const activitySort = ["recent", "oldest", "alphabetical"] as const; // Ordenação de atividades
export const activityStatus = ["now", "next"] as const; // Status de atividades

export const getActivitiesParams = z.object({
	query: z.string().optional(), // Para busca por nome ou descrição
	sort: z.enum(activitySort).optional(), // Ordenação por data
	page: z.coerce.number().default(0), // Paginação: página atual
	pageSize: z.coerce.number().default(10), // Paginação: tamanho da página
	status: z
		.union([z.array(z.enum(activityStatus)), z.enum(activityStatus)])
		.transform(transformSingleToArray)
		.optional(), // IDs de status
	category: z
		.union([z.array(z.enum(activityCategories)), z.enum(activityCategories)])
		.transform(transformSingleToArray)
		.optional(), // IDs de categorias
	audience: z
		.union([z.array(z.enum(activityAudiences)), z.enum(activityAudiences)])
		.transform(transformSingleToArray)
		.optional(), // Tipos de atividade (interno ou externo)
	speakerIds: z
		.union([z.array(z.string()), z.string()])
		.transform(transformSingleToArray)
		.optional(), // IDs de palestrantes
});
