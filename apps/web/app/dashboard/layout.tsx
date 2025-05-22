import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

// Components
import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

import { REM } from "next/font/google";
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

// API
import { serverClient } from "@/lib/trpc/server";

// Types
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Dashboard",
};

export default async function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const projectId = cookieStore.get("projectId")?.value;
	const projectUrl = cookieStore.get("projectUrl")?.value;

	if (!projectId || !projectUrl) {
		redirect("/account");
	}

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
				prefix={`/dashboard`}
				selectedProjectId={projectId}
				projects={projects}
				links={DASHBOARD_LINKS}
			/>
			{children}
			<Footer />
		</div>
	);
}
