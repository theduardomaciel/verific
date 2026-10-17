import {
	ProjectContributorAddedEmail,
	projectContributorAddedPreviewProps,
} from "../project-contributor-added";

/**
 * Dev-only entry point for `react-email dev` (see `pnpm --filter @verific/api
 * email:dev`). The implementation lives in `../project-contributor-added`; this
 * file only supplies sample props so the template shows up in the preview sidebar.
 */
export default function ProjectContributorAddedPreview() {
	return (
		<ProjectContributorAddedEmail
			{...projectContributorAddedPreviewProps}
		/>
	);
}
