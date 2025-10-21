// Reexporta tudo
export * from "zod";

// E também o default (caso alguém faça import z from "@verific/zod")
import * as z from "zod";
export { z };
export default z;