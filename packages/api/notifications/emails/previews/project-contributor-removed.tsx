import {
	ProjectContributorRemovedEmail,
	projectContributorRemovedPreviewProps,
} from "../project-contributor-removed";

export default function ProjectContributorRemovedPreview() {
	return (
		<ProjectContributorRemovedEmail
			{...projectContributorRemovedPreviewProps}
		/>
	);
}
