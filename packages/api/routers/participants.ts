import { z } from "zod";
import { transformSingleToArray } from "../utils";
import { participantRoles } from "@verific/drizzle/schema";
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";

export const participantSort = ["recent", "oldest", "alphabetical"] as const; // Ordenação de participantes

export const getParticipantsParams = z.object({
	query: z.string().optional(), // Para busca por nome ou e-mail
	sort: z.enum(participantSort).optional(), // Ordenação por data
	page: z.coerce.number().default(0), // Paginação: página atual
	pageSize: z.coerce.number().default(10), // Paginação: tamanho da página,
	role: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.enum(participantRoles)))
		.optional(), // Funções dos participantes
	course: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.enum(courses)))
		.optional(), // Cursos dos participantes
	period: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.enum(periods)))
		.optional(), // Períodos dos participantes
	projectIds: z
		.string()
		.transform(transformSingleToArray)
		.pipe(z.array(z.string().uuid()))
		.optional(), // IDs de projetos associados
});
