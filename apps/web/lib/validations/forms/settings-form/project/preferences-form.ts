import { z } from "zod";

// Schema para habilitar pesquisa
const researchSchema = z.object({
	enableResearch: z.boolean().default(false),
});

// Outros schemas podem ser adicionados aqui conforme necessário

export { researchSchema };
