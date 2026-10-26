import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountHeaderSkeleton } from "@/components/account/project-skeleton";
import { Footer } from "@/components/footer";
import { DashboardHeader } from "@/components/header/dashboard-header";

import { isAuthError, redirectToSignIn } from "@/lib/auth-redirect";
import { getCachedAccountProjects } from "@/lib/trpc/server";

const ACCOUNT_LINKS = [
	{ href: "", label: "Projetos" },
	{ href: "/settings", label: "Configurações" },
];

interface Props {
	children: React.ReactNode;
}

async function AccountLayoutContent({ children }: Props) {
	let projects;

	try {
		projects = await getCachedAccountProjects();
	} catch (error) {
		if (isAuthError(error)) {
			await redirectToSignIn();
		}
		// Falha do banco não é página inexistente: vai para o error boundary
		throw error;
	}

	if (!projects) {
		notFound();
	}

	return (
		<div className="flex w-full flex-1 flex-col">
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
