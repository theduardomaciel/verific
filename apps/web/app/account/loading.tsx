import { AccountProjectsSkeleton } from "@/components/account/project-skeleton";

export default function AccountLoading() {
	return (
		<main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center">
			<AccountProjectsSkeleton />
		</main>
	);
}
