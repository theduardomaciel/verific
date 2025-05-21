import type { Metadata } from "next";

// Icons
import Logo from "@/public/logo.svg";

// Components
import { ErrorDisplay } from "@/components/auth/ErrorDisplay";

// Components

export const metadata: Metadata = {
	title: "Acesso negado",
};

export default async function ErrorPage(props: {
	searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
	const params = await props.searchParams;
	const error = params.error || "default";

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<div className="bg-primary relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-b bg-[linear-gradient(180deg,_#2563EB_0%,_#3B82F6_100%)] px-6 py-12 text-white md:m-8 md:w-1/2 md:rounded md:p-12">
				<Logo className="h-10 md:h-12" />
			</div>

			{/* Right Part */}
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
