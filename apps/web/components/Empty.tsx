import Link from "next/link";

// Icons
import { CircleOff } from "lucide-react";

interface Props {
	href?: string;
}

export function Empty({ href }: Props) {
	const randomId = Math.random().toString(36).substring(7);

	return (
		<div className="border-foreground inline-flex w-full flex-col items-center justify-center gap-4 rounded-2xl border px-8 py-16">
			<CircleOff />
			<p className="font-title text-foreground text-center text-base font-bold">
				Parece que não encontramos nada com base em sua pesquisa e
				filtros :(
			</p>
			<p className="text-foreground text-center text-sm font-normal sm:w-[60%]">
				Tente procurar por algo com outras palavras, ou remover alguns
				filtros pra ver se você acha dessa vez!
			</p>
			{href && (
				<Link
					href={`${href}?r=${randomId}`}
					className="text-tertiary-200 underline"
				>
					Limpar filtros
				</Link>
			)}
		</div>
	);
}
