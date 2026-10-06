import type { ParticipantOnActivity } from "./participant-on-activity";
import type { Project } from "./project";
import type { User } from "./user";

export type Participant = {
	id: string;
	userId: string;
	projectId: string;
	joinedAt: Date;
	user: User;
	role: "participant" | "monitor";
	project: Project;
	participantsOnEvent: ParticipantOnActivity[];
};
