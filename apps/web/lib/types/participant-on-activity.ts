import { Activity } from "./activity";
import { Participant } from "./participant";

export type ParticipantOnActivity = {
	participantId: string;
	activityId: string;
	role: "participant" | "moderator";
	joinedAt: Date;
	leftAt?: Date;
	participant: Participant;
	activity?: Activity;
};
