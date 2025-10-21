import "dotenv/config";
import { drizzle_env as env } from "@verific/env/drizzle_env";

console.log("DATABASE_URL:");
console.log(env.DATABASE_URL);

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const connection = neon(env.DATABASE_URL);
const db = drizzle(connection, {
    schema,
});

function removeParticipantOnActivityFromId(participantId: string) {
    return db
        .delete(schema.participantOnActivity)
        .where(
            eq(schema.participantOnActivity.participantId, participantId),
        )
        .returning();
}

function addParticipantOnActivity(
    participantId: string,
    activityId: string,
    role: "participant" | "monitor",
) {
    return db
        .insert(schema.participantOnActivity)
        .values({
            participantId,
            activityId,
            role,
            joinedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: [
                schema.participantOnActivity.participantId,
                schema.participantOnActivity.activityId,
            ],
            set: {
                role,
                joinedAt: new Date(),
            },
        })
        .returning();
}

async function main() {
    /* const result = await removeParticipantOnActivityFromId(
        "b1fafff9-1f56-47ea-864d-26ba1c14a03a",
    );
    console.log("Deleted rows:", result); */
    const result = await addParticipantOnActivity(
        "1be86cbb-540d-4579-addc-6cf6a03f1862",
        "9bdb947d-b9b9-417c-a36c-4549df93a54f",
        "participant",
    );
    console.log("Inserted row:", result);
}

main().catch((error) => {
    console.error("Error executing script:", error);
}).then(() => {
    process.exit();
});