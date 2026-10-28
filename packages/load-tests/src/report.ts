import type { SeedDb } from "@verific/drizzle/seed";

import {
	countCrossProjectEnrollments,
	countEnrolled,
	countParticipants,
	countNotificationsByStatus,
	countPresences,
	findActivitiesOverLimit,
} from "./invariants";
import { loadStressEvent } from "./stress-event";

// Estado do cenário de estresse depois de uma execução
export async function checkStressEvent(db: SeedDb) {
	const { event } = await loadStressEvent(db);
	const { activities } = event;

	const counts = {
		participants: await countParticipants(db, event.projectId),
		limit50: await countEnrolled(db, activities.limit50),
		withForm: await countEnrolled(db, activities.withForm),
		spread: await Promise.all(
			activities.spread.map((id) => countEnrolled(db, id)),
		),
		checkins: await countPresences(db, activities.checkinSession),
		notifications: await countNotificationsByStatus(db, event.projectId),
	};
	const overLimit = await findActivitiesOverLimit(db, event.projectId);
	const crossProject = await countCrossProjectEnrollments(db);

	const lines = [
		`Participantes no evento: ${counts.participants}`,
		`Inscritos em "limite 50": ${counts.limit50}`,
		`Inscritos nas espalhadas: ${counts.spread.join(", ")}`,
		`Inscritos em "com formulário": ${counts.withForm}`,
		`Presenças no check-in: ${counts.checkins}`,
		`E-mails do evento: ${formatStatuses(counts.notifications)}`,
		...overLimit.map(
			(a) =>
				`⚠️  "${a.name}": ${a.enrolled} inscritos para ${a.limit} vagas`,
		),
		...(crossProject > 0
			? [`⚠️  ${crossProject} inscrições em atividades de outro evento`]
			: []),
	];

	return {
		ok: overLimit.length === 0 && crossProject === 0,
		counts,
		overLimit,
		lines,
	};
}

function formatStatuses(byStatus: Record<string, number>) {
	const entries = Object.entries(byStatus);
	if (entries.length === 0) return "nenhum";
	return entries.map(([status, amount]) => `${amount} ${status}`).join(", ");
}
