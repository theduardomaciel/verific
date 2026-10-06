"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";

interface ReportEventDialogProps {
	className?: string;
}

const reportReasons = [
	{ value: "inappropriate", label: "Conteúdo inadequado" },
	{ value: "spam", label: "Spam" },
	{ value: "copyright", label: "Violação de direitos autorais" },
	{ value: "other", label: "Outros" },
];

export function ReportEventDialog({ className }: ReportEventDialogProps) {
	const [currentState, setCurrentState] = useState<
		boolean | "submitting" | "submitted" | "error"
	>(false);
	const [selectedReason, setSelectedReason] = useState<string>("");
	const [description, setDescription] = useState<string>("");

	async function handleReport() {
		if (!selectedReason) return;

		setCurrentState("submitting");
		try {
			// TODO: Integrate with backend
			await new Promise((resolve) => setTimeout(resolve, 1000));
			setCurrentState("submitted");
		} catch (error) {
			setCurrentState("error");
		}
	}

	function resetForm() {
		setSelectedReason("");
		setDescription("");
		setCurrentState(false);
	}

	return (
		<>
			<Dialog
				open={typeof currentState === "boolean" ? currentState : false}
				onOpenChange={(open) => {
					if (!open) resetForm();
					else setCurrentState(open);
				}}
			>
				{/* Sem `asChild`: o Slot do Radix clona o filho e o HTML
					pré-renderizado diverge do hidratado (hydration mismatch).
					O gatilho é um botão nativo estilizado diretamente. */}
				<DialogTrigger
					className={cn(
						buttonVariants({ variant: "outline", size: "lg" }),
						"mt-4 max-lg:w-full",
						className,
					)}
				>
					<Flag className="mr-2 h-4 w-4" />
					<span>Denunciar este evento</span>
				</DialogTrigger>
				<DialogContent className="gap-2 sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Flag className="h-5 w-5" />
							Denunciar Evento
						</DialogTitle>
						<DialogDescription>
							Ajude-nos a manter a plataforma segura. Selecione o
							motivo da denúncia e forneça mais detalhes se
							necessário.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label
								className="mb-2 font-semibold"
								htmlFor="reason"
							>
								Motivo da denúncia
							</Label>
							<RadioGroup
								value={selectedReason}
								onValueChange={setSelectedReason}
							>
								{reportReasons.map((reason) => (
									<div
										key={reason.value}
										className="flex items-center space-x-2"
									>
										<RadioGroupItem
											value={reason.value}
											id={reason.value}
										/>
										<Label htmlFor={reason.value}>
											{reason.label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
						<div className="grid gap-2">
							<Label
								className="mb-2 font-semibold"
								htmlFor="description"
							>
								Descrição adicional (opcional)
							</Label>
							<Textarea
								id="description"
								placeholder="Forneça mais detalhes sobre a denúncia..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<DialogClose
							className={cn(
								buttonVariants({ variant: "outline" }),
							)}
						>
							Cancelar
						</DialogClose>
						<Button
							onClick={handleReport}
							disabled={
								!selectedReason || currentState === "submitting"
							}
						>
							{currentState === "submitting"
								? "Enviando..."
								: "Enviar Denúncia"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<LoadingDialog isOpen={currentState === "submitting"} />

			<SuccessDialog
				isOpen={currentState === "submitted"}
				title="Denúncia enviada"
				description="Obrigado por nos ajudar a manter a plataforma segura. Sua denúncia foi registrada e será analisada em breve."
				onClose={resetForm}
			/>

			<ErrorDialog
				isOpen={currentState === "error"}
				title="Erro ao enviar denúncia"
				description="Ocorreu um erro ao enviar sua denúncia. Tente novamente mais tarde."
				onClose={() => setCurrentState(false)}
			/>
		</>
	);
}
