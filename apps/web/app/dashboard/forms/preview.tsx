"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";
import { toast } from "sonner";

import { buildAnswersSchema } from "@verific/api/schemas";
import { groupFieldsIntoRows } from "@/lib/forms/layout";
import { DynamicField } from "@/components/forms/dynamic/DynamicField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RouterOutput } from "@verific/api";

type BuilderField = RouterOutput["getVersion"]["fields"][number];

/**
 * Faithful, interactive preview of what the participant will see.
 * Renders the same `DynamicField` components in the same row grouping
 * as the public JoinForm, with real validation — submitting only
 * validates locally and never sends data.
 */
export function FormPreview({ fields }: { fields: BuilderField[] }) {
	const visible = useMemo(
		() => fields.filter((f) => f.isActive && f.isVisible),
		[fields],
	);
	const hiddenCount = fields.length - visible.length;

	const rows = useMemo(() => groupFieldsIntoRows(visible), [visible]);

	const schema = useMemo(() => {
		const answers = buildAnswersSchema(
			visible.map((f) => ({
				key: f.key,
				label: f.label,
				type: f.type,
				required: f.required,
				options: f.options,
				validation: f.validation,
				isVisible: f.isVisible,
				isActive: f.isActive,
			})),
		);
		return z.object({
			name: z
				.string({ error: "Obrigatório" })
				.min(2, { message: "Informe seu nome completo." })
				.refine((v) => v.trim().split(/\s+/).length >= 2, {
					message: "Informe nome e sobrenome.",
				}),
			answers,
		});
	}, [visible]);

	const form = useForm<{ name: string; answers: Record<string, unknown> }>({
		resolver: zodResolver(schema as never),
		defaultValues: { name: "", answers: {} },
	});

	function onSubmit() {
		toast.success("Pré-visualização válida! Nenhum dado foi enviado.");
	}

	function onInvalid() {
		toast.error("Verifique os campos destacados.");
	}

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle className="flex flex-wrap items-center gap-2">
					Visão do participante
					<Badge variant="secondary">Pré-visualização</Badge>
				</CardTitle>
				{hiddenCount > 0 && (
					<span className="text-muted-foreground text-xs">
						{hiddenCount} campo{hiddenCount === 1 ? "" : "s"} oculto
						{hiddenCount === 1 ? "" : "s"} não exibido
						{hiddenCount === 1 ? "" : "s"}
					</span>
				)}
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, onInvalid)}
						className="flex w-full flex-col gap-6"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>
										Nome completo{" "}
										<span className="text-destructive ml-1">
											*
										</span>
									</FormLabel>
									<FormControl>
										<Input
											placeholder="Fulano da Silva"
											{...field}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{rows.length > 0 && (
							<div className="flex w-full flex-col gap-6">
								{rows.map((row, ri) => (
									<div
										key={
											row.fields
												.map((f) => f.id)
												.join("-") || `row-${ri}`
										}
										className={
											row.fields.length === 2
												? "grid w-full grid-cols-1 gap-6 md:grid-cols-2"
												: "w-full"
										}
									>
										{row.fields.map((f) => (
											<DynamicField
												key={f.id}
												field={f}
												control={form.control as never}
												name={`answers.${f.key}`}
											/>
										))}
									</div>
								))}
							</div>
						)}
						<div className="flex w-full flex-row items-center justify-between gap-4">
							<p className="text-muted-foreground text-sm">
								Não se preocupe, enviar o formulário aqui só
								valida os campos — nada é salvo ;)
							</p>
							<Button
								className="h-10 w-full px-4! font-bold md:w-fit"
								type="submit"
							>
								Enviar (simulação)
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
