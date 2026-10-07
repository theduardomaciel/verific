import type { Activity } from "./activity";
import type { Participant } from "./participant";
import type { Project } from "./project";
import type { Template } from "./template";

export type Certificate = {
	token: string;
	participantId: string;
	activityId: string;
	projectId: string;
	templateId: string;
	issuedAt: Date;
	participant?: Participant;
	activity?: Activity;
	project?: Project;
	template?: Template;
};
