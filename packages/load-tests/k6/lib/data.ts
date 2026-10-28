import { SharedArray } from "k6/data";

import type { SessionsFile } from "../../src/sessions-file.ts";

// Gerado por `pnpm sessions`
const FILE = __ENV.SESSIONS || "../../out/sessions.json";

const read = (): SessionsFile => JSON.parse(open(FILE)) as SessionsFile;

export const monitors = new SharedArray("monitors", () => read().monitors);
export const enrolled = new SharedArray("enrolled", () => read().enrolled);
export const newcomers = new SharedArray("newcomers", () => read().newcomers);
export const event = new SharedArray("event", () => [read().event])[0]!;
