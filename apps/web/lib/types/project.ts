import { Activity } from "./activity";
import { Participant } from "./participant";

export type Project = {
	id: string;
	name: string;
	description: string;
	url: string;
	address: string;
	hasRegistration: boolean;
	hasResearch: boolean;
	isArchived: boolean;
	coverUrl: string;
	thumbnailUrl: string;
	primaryColor: string;
	secondaryColor: string;
	startDate: Date;
	endDate: Date;
	createdAt: Date;
	activities: Activity[];
	participants: Participant[];
};
