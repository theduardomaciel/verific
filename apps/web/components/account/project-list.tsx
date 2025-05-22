// Icons
import { CircleSlash } from "lucide-react";

// Components
import { AccountEventCard } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";

// Types
import { RouterOutput } from "@verific/api";

interface Props {
	projects?: RouterOutput["getProjects"];
}

export function EventsList({ projects }: Props) {
	return (
		<div className="w-full max-w-md px-4">
			<h1 className="font-REM text-foreground mb-6 text-center text-2xl font-semibold">
				Selecione um projeto
			</h1>

			<div className="flex w-full flex-col gap-4 p-3 md:rounded-lg md:border md:p-6">
				{projects?.length ? (
					<ul className="flex flex-col items-center justify-start gap-3">
						{projects.map((project) => (
							<AccountEventCard
								key={project.id}
								project={project}
							/>
						))}
					</ul>
				) : (
					<div className="flex flex-col items-center justify-center gap-4 py-8">
						<CircleSlash size={24} />
						<p className="max-w-1/2 text-center text-sm">
							{" "}
							Nenhum projeto foi criado até o momento.
						</p>
					</div>
				)}

				<CreateProjectDialog />
			</div>
		</div>
	);
}
