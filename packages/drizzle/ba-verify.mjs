import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
	console.error("DATABASE_URL not set");
	process.exit(1);
}
const sql = neon(url);
const out = {};

try {
	out.columnTypes = await sql`
    SELECT table_name, column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name IN ('users','accounts','sessions')
      AND column_name IN ('id','user_id')
    ORDER BY table_name, column_name`;
} catch (e) {
	out.schemaErr = String(e).slice(0, 300);
}

// Exactly what Better Auth does on first-time social sign-in:
// generateId() => 32 chars from [a-zA-Z0-9], then INSERT.
const baId = "aB3xK9mQ2pL7vR4tY8wZ1nC5dF0gH6jK";
out.baGeneratedId = baId;
out.baIdLength = baId.length;

try {
	await sql`INSERT INTO users (id, name, email, "emailVerified", public_email, created_at, updated_at)
    VALUES (${baId}, 'Verify Probe', 'verify-probe@example.com', false, 'verify-probe@example.com', now(), now())
    RETURNING id`;
	out.userInsert_baStyleId = "SUCCEEDED";
	await sql`DELETE FROM users WHERE id = ${baId}::uuid`.catch(() => {});
} catch (e) {
	out.userInsert_baStyleId_ERROR = String(e.message ?? e).slice(0, 400);
}

// Contrast: a real UUID through the same insert path
const realUuid = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
try {
	await sql`INSERT INTO users (id, name, email, "emailVerified", public_email, created_at, updated_at)
    VALUES (${realUuid}, 'Verify Probe 2', 'verify-probe2@example.com', false, 'verify-probe2@example.com', now(), now())
    RETURNING id`;
	out.userInsert_realUuid = "SUCCEEDED";
	await sql`DELETE FROM users WHERE id = ${realUuid}`;
} catch (e) {
	out.userInsert_realUuid_ERROR = String(e.message ?? e).slice(0, 300);
}

// Are there any real users in the DB yet?
try {
	out.userCount = await sql`SELECT count(*)::int AS c FROM users`;
	out.sampleUserIds = await sql`SELECT id FROM users LIMIT 5`;
} catch (e) {
	out.countErr = String(e).slice(0, 200);
}

console.log(JSON.stringify(out, null, 2));
