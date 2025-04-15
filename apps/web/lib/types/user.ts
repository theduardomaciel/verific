import { Participant } from "./participant";

export type User = {
	id: string;
	name: string | null;
	email: string;
	emailVerified: Date | null;
	image_url: string | null;
	participants?: Participant[];
};
