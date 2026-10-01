import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@verific/auth";

export const { GET, POST } = toNextJsHandler(auth);
