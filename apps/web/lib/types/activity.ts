import { ParticipantOnActivity } from "./participant-on-activity";
import { Project } from "./project";
import { Speaker } from "./speaker";

export type Activity = {
	id: string;
	name: string;
	description: string;
	dateFrom: Date;
	dateTo: Date;
	audience: "internal" | "external";
	category: "lecture" | "workshop" | "round-table" | "course" | "other";
	speakerId?: number;
	participantsLimit?: number;
	workload?: number;
	projectId: string;
	createdAt: Date;
	project?: Project;
	speaker: Speaker;
	participantOnActivity: ParticipantOnActivity[];
};
