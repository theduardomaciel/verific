// Check-in por QR (P1). TARGET = leituras por segundo.
import { scenario, thresholds } from "./lib/profiles.ts";
export { checkin } from "./lib/flows.ts";

export const options = {
	scenarios: { checkin: scenario("checkin", { target: 10, arrival: true }) },
	thresholds,
};
