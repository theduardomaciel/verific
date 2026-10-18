export { auth } from "./auth.config";

export {
	emitAuthUserChanged,
	isAuthIdentityEndpoint,
	offAuthUserChanged,
	onAuthUserChanged,
	type AuthUserChange,
	type AuthUserChangeListener,
	type AuthUserChangeReason,
} from "./cache-hooks";

export type { Session, User } from "./auth.config";
