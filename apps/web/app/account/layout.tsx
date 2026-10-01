import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardHeader } from "@/components/header/dashboard-header";
import { Footer } from "@/components/footer";
import { AccountHeaderSkeleton } from "@/components/account/project-skeleton";
import { getCachedAccountProjects } from "@/lib/trpc/server";
import { REM } from "next/font/google";

const rem = REM({
	variable: "--font-rem",
	subsets: ["latin"],
});

const ACCOUNT_LINKS = [
	{ href: "", label: "Projetos" },
	{ href: "/settings", label: "Configurações" },
];

interface Props {
	children: React.ReactNode;
}

async function AccountLayoutContent({ children }: Props) {
	const projects = await getCachedAccountProjects();

	if (!projects) {
		notFound();
	}

	return (
		<div className={`${rem.variable} flex w-full flex-1 flex-col`}>
			<DashboardHeader
				prefix="/account"
				links={ACCOUNT_LINKS}
				showAccountActions={false}
				projects={projects.owned}
			/>
			{children}
			<Footer />
		</div>
	);
}

export default function AccountLayout({ children }: Props) {
	return (
		<Suspense fallback={<AccountHeaderSkeleton />}>
			<AccountLayoutContent>{children}</AccountLayoutContent>
		</Suspense>
	);
}
