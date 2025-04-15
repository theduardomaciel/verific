export type Template = {
	id: string;
	title: string;
	description: string;
	logos?: string[];
	signatures?: {
		name: string;
		role: string;
		signature_url: string;
	}[];
	maxSignatures: number;
	issuedAt: Date;
};
