import { Activity } from "./activity";
import { Participant } from "./participant";

export type ParticipantOnActivity = {
	joinedAt: Date;
	leftAt?: Date;
	participant: Participant;
	activity?: Activity;
};
