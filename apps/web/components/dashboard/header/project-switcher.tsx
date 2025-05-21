"use client";

import Link from "next/link";
import * as React from "react";
import { Check, ChevronsUpDown, FolderCog } from "lucide-react";

import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

type Project = {
	id: string;
	label: string;
	image?: string | null;
};

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
	typeof PopoverTrigger
>;

interface Props extends PopoverTriggerProps {
	selectedProjectId: string;
	projects: Project[];
}

export function ProjectSwitcher({
	className,
	selectedProjectId,
	projects,
}: Props) {
	const [open, setOpen] = React.useState(false);
	const [selectedProject, setSelectedProject] = React.useState<Project>(
		projects.find((project) => project.id === selectedProjectId) ||
			projects[0]!,
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label="Selecione um projeto"
					className={cn("w-[200px] justify-between", className)}
				>
					<Avatar className="mr-1 h-5 w-5">
						<AvatarImage
							src={selectedProject.image || ""}
							alt={selectedProject.label}
							className="grayscale"
						/>
						<AvatarFallback>
							{selectedProject.label.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					<span className="line-clamp-1 w-full text-left">
						{selectedProject.label.slice(0, 15) +
							(selectedProject.label.length > 15 ? "..." : "")}
					</span>
					<ChevronsUpDown className="ml-auto opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder="Procurar projeto..." />
					<CommandList>
						<CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
						{projects.map((project) => (
							<CommandItem
								key={project.id}
								onSelect={() => {
									setSelectedProject(project);
									setOpen(false);
								}}
								className="rounded-none py-2 text-sm"
								asChild
							>
								<Link
									href={`/dashboard/${project.id}`}
									passHref
									className="w-full"
								>
									<Avatar className="mr-2 h-5 w-5">
										<AvatarImage
											src={project.image || ""}
											alt={project.label}
											className="grayscale"
										/>
										<AvatarFallback>
											{project.label.slice(0, 2)}
										</AvatarFallback>
									</Avatar>
									{project.label}
									<Check
										className={cn(
											"ml-auto",
											selectedProject.id === project.id
												? "opacity-100"
												: "opacity-0",
										)}
									/>
								</Link>
							</CommandItem>
						))}
					</CommandList>
					<CommandSeparator />
					<CommandList>
						<CommandGroup>
							<Link href={"/account"} passHref>
								<CommandItem
									onSelect={() => {
										setOpen(false);
									}}
								>
									<FolderCog className="h-5 w-5" />
									Ver projetos
								</CommandItem>
							</Link>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
