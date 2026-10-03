"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";
import { PencilIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import type { Section } from "../../types";
import type { UseFormsBuilder } from "../../hooks/use-forms-builder";

const sectionFormSchema = z.object({
	title: z.string().trim().min(1, "Obrigatório").max(120),
});

type SectionFormValues = z.infer<typeof sectionFormSchema>;

interface SectionDialogProps {
	versionId: string;
	initial?: Section;
	upsertSection: UseFormsBuilder["upsertSection"];
}

export function SectionDialog({
	versionId,
	initial,
	upsertSection,
}: SectionDialogProps) {
	const [open, setOpen] = useState(false);
	const form = useForm<SectionFormValues>({
		resolver: zodResolver(sectionFormSchema) as never,
		defaultValues: { title: initial?.title ?? "" },
	});

	useEffect(() => {
		if (open) form.reset({ title: initial?.title ?? "" });
	}, [open, initial, form]);

	function submit(values: SectionFormValues) {
		upsertSection.mutate(
			{
				versionId,
				...(initial ? { sectionId: initial.id } : {}),
				title: values.title,
			},
			{ onSuccess: () => setOpen(false) },
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant={initial ? "ghost" : "outline"}>
					{initial ? <PencilIcon /> : <PlusIcon />}
					{initial ? "Renomear" : "Nova seção"}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>
						{initial ? "Renomear seção" : "Nova seção"}
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(submit)}
						className="flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Título da seção</FormLabel>
									<FormControl>
										<Input
											placeholder="Ex: Dados pessoais"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							disabled={upsertSection.isPending}
						>
							{upsertSection.isPending
								? "Salvando..."
								: "Salvar seção"}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
