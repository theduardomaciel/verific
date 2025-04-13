"use client";

import * as React from "react";
import { Check, ChevronsUpDown, FolderCog, PlusCircle } from "lucide-react";

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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const projects = [
	{
		label: "SECOMP 2025",
		value: "secomp2025",
	},
	{
		label: "Escola de Inverno 2024",
		value: "escoladeinverno2024",
	},
];

type Project = (typeof projects)[number];

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
	typeof PopoverTrigger
>;

interface ProjectSwitcherProps extends PopoverTriggerProps {}

export default function ProjectSwitcher({ className }: ProjectSwitcherProps) {
	const [open, setOpen] = React.useState(false);
	const [selectedProject, setSelectedProject] = React.useState<Project>(
		projects[0],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: No semantic element for this component
					role="combobox"
					aria-expanded={open}
					aria-label="Selecione um projeto"
					className={cn("w-[200px] justify-between", className)}
				>
					<Avatar className="mr-1 h-5 w-5">
						<AvatarImage
							src={`https://avatar.vercel.sh/${selectedProject.value}.png`}
							alt={selectedProject.label}
							className="grayscale"
						/>
						<AvatarFallback>SC</AvatarFallback>
					</Avatar>
					<span className="text-left w-full line-clamp-1">
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
								key={project.value}
								onSelect={() => {
									setSelectedProject(project);
									setOpen(false);
								}}
								className="text-sm py-2 rounded-none"
							>
								<Avatar className="mr-2 h-5 w-5">
									<AvatarImage
										src={`https://avatar.vercel.sh/${project.value}.png`}
										alt={project.label}
										className="grayscale"
									/>
									<AvatarFallback>LA</AvatarFallback>
								</Avatar>
								{project.label}
								<Check
									className={cn(
										"ml-auto",
										selectedProject.value === project.value
											? "opacity-100"
											: "opacity-0",
									)}
								/>
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
