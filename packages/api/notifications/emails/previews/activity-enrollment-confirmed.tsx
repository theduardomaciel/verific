import {
	ActivityEnrollmentConfirmedEmail,
	activityEnrollmentConfirmedPreviewProps,
} from "../participant-emails";

/**
 * Dev-only entry point for `react-email dev` (see `pnpm --filter @verific/api
 * email:dev`). The implementation lives in `../participant-emails`; this file
 * only supplies sample props so the template shows up in the preview sidebar.
 */
export default function ActivityEnrollmentConfirmedPreview() {
	return (
		<ActivityEnrollmentConfirmedEmail
			{...activityEnrollmentConfirmedPreviewProps}
		/>
	);
}
