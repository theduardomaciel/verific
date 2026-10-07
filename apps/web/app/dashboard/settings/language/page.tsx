import { ProjectSettingsLanguageForm } from "./form";

// API (se necessário para buscar dados específicos de idioma)
// import { serverClient } from "@/lib/trpc/server";

export default async function LanguageSettingsPage() {
	// const { projectId } = await params;
	// const project = await serverClient.getProject({ id: projectId }); // Se precisar de dados do projeto

	// return <ProjectSettingsLanguageForm project={project} />;
	return <ProjectSettingsLanguageForm />;
}
