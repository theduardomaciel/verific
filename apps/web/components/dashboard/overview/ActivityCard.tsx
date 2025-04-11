import { Calendar } from "lucide-react";

interface ActivityCardProps {
	number: number;
	title: string;
	presenter: string;
	type: string;
	status: "AGORA" | "EM INSTANTES" | "HOJE";
	time?: string;
}

export function ActivityCard({
	number,
	title,
	presenter,
	type,
	status,
	time,
}: ActivityCardProps) {
	return (
		<div className="flex flex-col space-y-2 rounded-md border border-gray-200 p-4">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold">Atividade {number}</h3>
				<span className="text-xs text-gray-500">{type}</span>
			</div>
			<p className="text-sm text-gray-600">{presenter}</p>
			<div className="flex items-center justify-between">
				{status === "AGORA" && (
					<span className="rounded-md bg-[#3b82f6] px-3 py-1 text-xs font-medium text-white">
						AGORA
					</span>
				)}
				{status === "EM INSTANTES" && (
					<span className="rounded-md bg-[#eab308] px-3 py-1 text-xs font-medium text-white">
						EM INSTANTES
					</span>
				)}
				{status === "HOJE" && (
					<div className="flex items-center gap-1 text-xs text-gray-500">
						<Calendar className="h-4 w-4" />
						<span>{time}</span>
					</div>
				)}
			</div>
		</div>
	);
}
