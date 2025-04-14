import Link from "next/link";

// Components
import { EventCard } from "./event-card";
import { CreateProjectDialog } from "./create-project-dialog";

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
		<div className="w-full max-w-md px-4">
			<h1 className="font-REM text-foreground mb-6 text-center text-2xl font-semibold">
				Selecione um projeto
			</h1>

			<div className="flex w-full flex-col gap-4 p-3 md:rounded-lg md:border md:p-6">
				<ul className="flex flex-col items-center justify-start gap-3">
					{projects.map((project) => (
						<Link
							href={"dashboard"}
							key={project.id}
							className="w-full"
						>
							<EventCard
								key={project.id}
								name={project.name}
								createdAt={project.createdAt}
							/>
						</Link>
					))}
				</ul>

				<CreateProjectDialog />
			</div>
		</div>
	);
}
