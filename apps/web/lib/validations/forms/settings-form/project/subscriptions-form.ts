import { z } from "@verific/zod"

// Schema para gerenciamento de inscrições
const subscriptionManagementSchema = z.object({
	enableSubscription: z.boolean().default(true),
});

export { subscriptionManagementSchema };
