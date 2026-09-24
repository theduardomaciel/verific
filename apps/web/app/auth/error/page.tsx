import type { Metadata } from "next";
import { Suspense } from "react";

import Logo from "@/public/logo.svg";
import { ErrorDisplay } from "@/components/auth/ErrorDisplay";

export const metadata: Metadata = {
	title: "Acesso negado",
};

async function ErrorContent({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
	const params = await searchParams;
	const error = params.error || "default";

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<div className="bg-primary relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-b bg-[linear-gradient(180deg,#2563EB_0%,#3B82F6_100%)] px-6 py-12 text-white md:m-8 md:w-1/2 md:rounded md:p-12">
				<Logo className="h-10 md:h-12" />
			</div>

			<div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
				<div className="flex w-full max-w-sm flex-col items-start justify-center gap-6 max-md:pb-8">
					<div className="flex flex-col items-start justify-start gap-6">
						<h1 className="text-2xl leading-[95%] font-bold">
							Algo não está certo...
						</h1>
						<ErrorDisplay error={error} />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ErrorPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
	return (
		<Suspense fallback={<div className="min-h-screen" />}>
			<ErrorContent searchParams={searchParams} />
		</Suspense>
	);
}
