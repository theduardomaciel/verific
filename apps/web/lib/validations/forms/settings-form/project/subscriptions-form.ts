import { z } from "@verific/zod"

// Schema para gerenciamento de inscrições
const subscriptionManagementSchema = z.object({
	enableSubscription: z.boolean().default(true),
});

// Schema para habilitar pesquisa
const researchSchema = z.object({
	enableResearch: z.boolean().default(false),
	researchUrl: z.url("URL inválida").optional().or(z.literal("")),
});

export { subscriptionManagementSchema, researchSchema };
