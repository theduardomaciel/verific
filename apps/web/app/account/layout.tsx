import { notFound } from "next/navigation";

// Components
import { DashboardHeader } from "@/components/dashboard/header";
import { Footer } from "@/components/footer";

// API
import { serverClient } from "@/lib/trpc/server";

import { REM } from "next/font/google";
const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const ACCOUNT_LINKS = [
	{ href: "", label: "Projetos" },
	{ href: "/settings", label: "Configurações" },
];

export default async function AccountLayout({
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

	return (
		<div className={`${rem.variable} flex w-full flex-1 flex-col`}>
			<DashboardHeader
				prefix="/account"
				links={ACCOUNT_LINKS}
				showProjectSwitcher={false}
				showAccountActions={false}
				projects={projects}
				selectedProjectId={projectId}
			/>
			{children}
			<Footer />
		</div>
	);
}
