import { REM } from "next/font/google";

import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const DASHBOARD_LINKS = [
	{ href: "", label: "Visão Geral" },
	{ href: "/activities", label: "Atividades" },
	{ href: "/participants", label: "Participantes" },
	{ href: "/settings", label: "Configurações" },
];

import type { Metadata } from "next";
import { serverClient } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
export const metadata: Metadata = {
	title: "Dashboard",
};

export default async function DashboardLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ projectId: string }>;
}>) {
	const { projectId } = await params;

	let projects;

	try {
		projects = await serverClient.getProjects();
	} catch (error) {
		console.error("Error fetching project:", error);
		notFound();
	}

	const projectsIds = projects.map((project) => project.id);

	if (!projectsIds.includes(projectId)) {
		notFound();
	}

	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col items-center`}
		>
			<DashboardHeader
				prefix={`/dashboard/${projectId}`}
				selectedProjectId={projectId}
				projects={projects}
				links={DASHBOARD_LINKS}
			/>
			{children}
			<Footer />
		</div>
	);
}
