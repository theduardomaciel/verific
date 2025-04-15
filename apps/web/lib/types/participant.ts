import { ParticipantOnActivity } from "./participant-on-activity";
import { Project } from "./project";
import { User } from "./user";

export type Participant = {
	id: string;
	userId: string;
	projectId: string;
	course: string;
	registrationId: string;
	period: string;
	joinedAt: Date;
	user: User;
	project: Project;
	participantsOnEvent: ParticipantOnActivity[];
};
