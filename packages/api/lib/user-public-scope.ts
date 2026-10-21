import { db } from "@verific/drizzle";
import { eq } from "@verific/drizzle/orm";
import { participant, project } from "@verific/drizzle/schema";

export type UserProfileRef = {
	projectId: string;
	shortId: string;
};

/**
 * Perfis públicos em que o usuário aparece como participante.
 *
 * O nome vem de `user.name` em `getProfilePageData`; portanto uma mudança de
 * nome só precisa regenerar as entradas `participant-profile:<projectId>:<shortId>`
 * do próprio usuário, não todos os perfis do evento/projeto.
 */
export async function userProfileRefs(
	userId: string,
): Promise<UserProfileRef[]> {
	const rows = await db.query.participant.findMany({
		where: eq(participant.userId, userId),
		columns: { projectId: true, shortId: true },
	});

	return rows.flatMap((row) =>
		row.shortId ? [{ projectId: row.projectId, shortId: row.shortId }] : [],
	);
}

/**
 * Landings de eventos em que o usuário é o produtor exibido.
 *
 * `getEventLanding` renderiza `project.owner.name` (e o e-mail público do
 * produtor). `updateUser` só altera o nome; logo, apenas os projetos
 * próprios precisam ser regenerados quando o nome muda.
 */
export async function userOwnedProjectIds(userId: string): Promise<string[]> {
	const rows = await db.query.project.findMany({
		where: eq(project.ownerId, userId),
		columns: { id: true },
	});

	return rows.map((row) => row.id);
}
