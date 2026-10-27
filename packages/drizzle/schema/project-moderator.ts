import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { projectMemberRoleEnum } from "../enum/project-role";
import { project } from "./project";
import { user } from "./user";

import type { ProjectPermission } from "../permissions";

export const projectModerator = pgTable(
	"project_moderators",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		/**
		 * Papel na equipe. `admin` preserva o comportamento histórico dos
		 * "contribuidores"; `staff` é o monitor operacional (recepção).
		 */
		role: projectMemberRoleEnum("role").notNull().default("admin"),
		/**
		 * Lista explícita de permissões. `null` = padrões do papel; `[]` =
		 * nenhuma permissão além do acesso básico ao dashboard.
		 */
		permissions: jsonb("permissions").$type<ProjectPermission[]>(),
		/**
		 * Membros da equipe normalmente ficam fora do ranking. Quando ligado,
		 * o membro concorre normalmente (desde que tenha inscrição no evento).
		 */
		includeInRanking: boolean("include_in_ranking")
			.notNull()
			.default(false),
		assignedAt: timestamp("assigned_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("project_moderators_project_user_unique").on(
			table.projectId,
			table.userId,
		),
		index("project_moderators_user_id_idx").on(table.userId),
	],
);

export const projectModeratorRelations = relations(
	projectModerator,
	({ one }) => ({
		project: one(project, {
			fields: [projectModerator.projectId],
			references: [project.id],
		}),
		user: one(user, {
			fields: [projectModerator.userId],
			references: [user.id],
		}),
	}),
);
