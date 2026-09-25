import { auth } from "./auth.config";

async function main() {
	const out: Record<string, unknown> = {};

	// Reproduce exactly what Better Auth's OAuth callback does on FIRST-TIME sign-in:
	// internalAdapter.create({ model: "user", data: {...} })
	const ctx = await auth.$context;
	const adapter = ctx.internalAdapter;

	const probeEmail = "e2e-probe@example.com";

	try {
		const created = await adapter.create({
			model: "user",
			data: {
				name: "E2E Probe",
				email: probeEmail,
				emailVerified: true,
				publicEmail: probeEmail,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});
		out.userCreated = created;
	} catch (e: any) {
		out.userCreateErrorName = e?.name;
		out.userCreateErrorMessage = String(e?.message ?? e).slice(0, 600);
	}

	console.log(JSON.stringify(out, null, 2));
}

main();
