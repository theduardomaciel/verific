import { Activity } from "./activity";
import { Participant } from "./participant";
import { Project } from "./project";
import { Template } from "./template";

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
