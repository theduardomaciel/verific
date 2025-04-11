import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EventCard } from "./EventCard";
import Link from "next/link";

const projects = [
	{
		id: 1,
		name: "SECOMP 2025",
		createdAt: "12/11/2024",
	},
	{
		id: 2,
		name: "Escola de Inverno 2024",
		createdAt: "09/06/2024",
	},
	{
		id: 3,
		name: "SECOMP 2024",
		createdAt: "08/11/2023",
	},
];

export function EventList() {
	return (
		<div className="w-full max-w-lg px-4">
			<h1 className="font-REM text-foreground text-2xl font-semibold text-center mb-6">
				Selecione um projeto
			</h1>

			<div className="bg-default rounded-lg p-4">
				<div className="flex flex-col gap-4 border p-6 rounded">
					<ul className="flex flex-col items-center justify-start gap-1">
						{projects.map((project) => (
							<Link href={"dashboard"} key={project.id} className="w-full">
								<EventCard
									key={project.id}
									name={project.name}
									createdAt={project.createdAt}
								/>
							</Link>
						))}
					</ul>

					<Button
						className="w-full py-6 bg-primary hover:bg-blue-600 text-white flex items-center justify-center gap-2"
						size={"lg"}
					>
						<Plus className="font-hanken font-medium text-base leading-6 tracking-normal align-middle" />
						Criar novo projeto
					</Button>
				</div>
			</div>
		</div>
	);
}
