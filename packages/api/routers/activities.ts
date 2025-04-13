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
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.enum(activityStatus)))
		.optional(), // IDs de status
	category: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.enum(activityCategories)))
		.optional(), // IDs de categorias
	audience: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.enum(activityAudiences)))
		.optional(), // Tipos de atividade (interno ou externo)
	speakerIds: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.string().uuid()))
		.optional(), // IDs de palestrantes
});
