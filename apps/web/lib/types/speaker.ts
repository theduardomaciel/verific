import { Activity } from "./activity";
import { Project } from "./project";

export type Speaker = {
	id: number;
	name: string;
	description: string;
	image_url: string;
	projectId: string;
	project?: Project;
	activities?: Activity[];
};
