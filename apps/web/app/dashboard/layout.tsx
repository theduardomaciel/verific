import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { DashboardHeader } from "@/components/header/dashboard-header";
import { Footer } from "@/components/footer";
import { REM } from "next/font/google";
import { getCachedAccountProjects } from "@/lib/trpc/server";
import type { Metadata } from "next";

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

export const metadata: Metadata = {
	title: "Dashboard",
};

async function DashboardLayoutContent({
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
		projects = await getCachedAccountProjects();
	} catch {
		notFound();
	}

	const projectIds = projects.owned
		.map((project) => project.id)
		.concat(projects.shared.map((project) => project.id));

	if (!projectIds.includes(projectId)) {
		notFound();
	}

	return (
		<div
			className={`${rem.variable} flex w-full flex-1 flex-col items-center`}
		>
			<DashboardHeader
				prefix={`/dashboard`}
				selectedProjectId={projectId}
				projects={projects.owned.concat(projects.shared)}
				links={DASHBOARD_LINKS}
			/>
			{children}
			<Footer />
		</div>
	);
}

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<Suspense
			fallback={<div className="min-h-screen w-full" aria-hidden />}
		>
			<DashboardLayoutContent>{children}</DashboardLayoutContent>
		</Suspense>
	);
}
