import Link from "next/link";

// Icons
import { CircleOff } from "lucide-react";

interface Props {
	href?: string;
	title?: string;
	description?: string | React.ReactNode;
	className?: string;
}

export function Empty({ href, title, description }: Props) {
	const randomId = Math.random().toString(36).substring(7);

	return (
		<div className="inline-flex w-full flex-col items-center justify-center gap-4 rounded-2xl border px-6 py-12">
			<CircleOff />
			<p className="font-title text-foreground text-center text-base font-bold">
				{title ??
					"Parece que não encontramos nada com base em sua pesquisa e filtros :("}
			</p>
			{typeof description === "string" || description === undefined ? (
				<p className="text-foreground text-center text-sm font-normal sm:w-[60%]">
					{description ??
						"Tente procurar por algo com outras palavras, ou remover alguns filtros pra ver se você acha dessa vez!"}
				</p>
			) : (
				description
			)}
			{href && (
				<Link
					href={`${href}`}
					className="text-foreground underline"
					replace
				>
					Limpar filtros
				</Link>
			)}
		</div>
	);
}
