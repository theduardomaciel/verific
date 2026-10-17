import {
	ProjectDeletedEmail,
	projectDeletedPreviewProps,
} from "../project-deleted";

export default function ProjectDeletedPreview() {
	return <ProjectDeletedEmail {...projectDeletedPreviewProps} />;
}
