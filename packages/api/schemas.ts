import { z } from "@verific/zod";

import { activityAudiences } from "@verific/drizzle/enum/audience";
import { activityCategories } from "@verific/drizzle/enum/category";
import { courses } from "@verific/drizzle/enum/course";
import { periods } from "@verific/drizzle/enum/period";
import { participantRoles } from "@verific/drizzle/enum/role";

import {
	createEnumArraySchema,
	sortOptions,
} from "./utils";

/**
 * Client-safe query param schemas.
 *
 * These schemas contain only zod + enum imports (no `db`, no server env),
 * so they can be imported from `"use client"` components without pulling
 * server-only modules into the browser bundle.
 *
 * Router files re-export from here. Client components must import from
 * `@verific/api/schemas`, never from `@verific/api/routers/*`.
 */

export const activitySort = ["asc", "desc", "name_asc", "name_desc"] as const;

export const getActivityParams = z.object({
	page: z.coerce.number().default(1).optional(),
	pageSize: z.coerce.number().default(5).optional(),
	search: z.string().optional(),
	sort: z.enum(sortOptions).optional(),
});

export const getActivitiesParams = z.object({
	query: z.string().optional(),
	sort: z.enum(activitySort).optional(),
	page: z.coerce.number().default(0).optional(),
	pageSize: z.coerce.number().default(10).optional(),
	category: createEnumArraySchema(activityCategories).optional(),
	audience: createEnumArraySchema(activityAudiences).optional(),
});

export const getParticipantsParams = z.object({
	query: z.string().optional(), // Para busca por nome ou e-mail
	sort: z.enum(sortOptions).optional(), // Ordenação por data
	page: z.coerce.number().default(0), // Paginação: página atual
	pageSize: z.coerce.number().default(10), // Paginação: tamanho da página,
	role: z.array(z.enum(participantRoles)).optional(), // Funções dos participantes
	course: z.array(z.enum(courses)).optional(), // Cursos dos participantes
	period: z.array(z.enum(periods)).optional(), // Períodos dos participantes
});
