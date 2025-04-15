import { Activity } from "./activity";
import { Participant } from "./participant";

export type ParticipantOnActivity = {
	participantId: string;
	activityId: string;
	joinedAt: Date;
	leftAt?: Date;
	participant: Participant;
	activity?: Activity;
};
