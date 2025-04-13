"use client";

import { useState } from "react";

// Icons
import { Plus } from "lucide-react";

// Components
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";

export function CreateProjectDialog() {
	const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

	return (
		<Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
			<DialogTrigger asChild>
				<Button
					className="w-full py-6 bg-primary flex items-center justify-center gap-2 leading-none"
					size={"lg"}
				>
					<Plus className="mt-0.5" />
					Criar novo projeto
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Criar projeto</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4">
					<Label htmlFor="name">Nome</Label>
					<Input id="name" placeholder="Insira o nome do projeto" />
				</div>
				<div className="grid">
					<Label className="mb-4" htmlFor="description">
						Descrição
					</Label>
					<Textarea
						id="description"
						placeholder="Insira uma breve descrição do projeto"
					/>
					<p className="text-sm text-muted-foreground mt-1.5">
						Máximo de 3000 caracteres
					</p>
				</div>
				<DialogFooter>
					<Button type="submit">Criar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* 
<DialogContent>
				<DialogHeader>
					<DialogTitle>Create project</DialogTitle>
					<DialogDescription>
						Add a new project to manage products and customers.
					</DialogDescription>
				</DialogHeader>
				<div>
					<div className="space-y-4 py-2 pb-4">
						<div className="space-y-2">
							<Label htmlFor="name">Project name</Label>
							<Input id="name" placeholder="Acme Inc." />
						</div>
						<div className="space-y-2">
							<Label htmlFor="plan">Subscription plan</Label>
							<Select>
								<SelectTrigger>
									<SelectValue placeholder="Select a plan" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="free">
										<span className="font-medium">Free</span> -{" "}
										<span className="text-muted-foreground">
											Trial for two weeks
										</span>
									</SelectItem>
									<SelectItem value="pro">
										<span className="font-medium">Pro</span> -{" "}
										<span className="text-muted-foreground">
											$9/month per user
										</span>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setShowNewProjectDialog(false)}
					>
						Cancel
					</Button>
					<Button type="submit">Continue</Button>
				</DialogFooter>
			</DialogContent>
*/
