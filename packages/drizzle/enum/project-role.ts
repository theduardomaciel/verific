import { pgEnum } from "drizzle-orm/pg-core";

export const projectMemberRoleEnum = pgEnum("project_member_role", [
	"admin",
	"staff",
]);

export type ProjectMemberRoleDb =
	(typeof projectMemberRoleEnum.enumValues)[number];
