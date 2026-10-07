import type { Activity } from "./activity";
import type { Participant } from "./participant";

export type ParticipantOnActivity = {
	joinedAt: Date;
	leftAt?: Date;
	participant: Participant;
	activity?: Activity;
};
