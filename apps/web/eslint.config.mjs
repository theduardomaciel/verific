import { globalIgnores } from "eslint/config";
import { nextJsConfig } from "@verific/eslint-config/next-js";

export default [
	globalIgnores([".next/**", "node_modules/**"]),
	...nextJsConfig,
];
