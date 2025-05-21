"use client";

// Icons
import { RefreshCcw } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	console.log(error, error.digest);

	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			{/* Right Part */}
			<div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
				<div className="flex w-full max-w-sm flex-col items-start justify-center gap-6 max-md:pb-8">
					<div className="flex flex-col items-start justify-start gap-6">
						<h1 className="text-3xl leading-[95%] font-bold">
							Ops… algo deu errado nos nossos bastidores.
						</h1>
						<p>
							Estamos trabalhando nos ajustes — recarregue a
							página ou tente novamente em alguns instantes.
						</p>
						<span className="bg-muted w-full rounded-md border p-4 font-mono text-sm">
							{error.message && error.message}
						</span>
						<Button size={"lg"} onClick={() => reset()}>
							<RefreshCcw />
							Tentar novamente
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
