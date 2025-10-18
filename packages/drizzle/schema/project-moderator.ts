import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { project } from "./project";
import { user } from "./user";

export const projectModerator = pgTable("project_moderators", {
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
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const projectModeratorRelations = relations(projectModerator, ({ one }) => ({
    project: one(project, {
        fields: [projectModerator.projectId],
        references: [project.id],
    }),
    user: one(user, {
        fields: [projectModerator.userId],
        references: [user.id],
    }),
}));