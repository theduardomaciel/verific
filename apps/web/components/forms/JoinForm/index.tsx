"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@verific/zod";

// Components
import { FormSection, SectionFooter } from "@/components/forms";
import { Form, FormWrapper } from "@/components/ui/form";
import { DynamicField } from "@/components/forms/dynamic/DynamicField";
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import JoinForm0 from "./Section0";

// Validation
import { buildAnswersSchema } from "@verific/api/schemas";
import { groupFieldsBySection } from "@/lib/forms/layout";
import type { GenericForm } from "..";

// Types
import type { User } from "@verific/auth";

// API
import { trpc } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import { revalidateParticipantEnrollment } from "@/app/actions";

interface JoinFormProps {
	user?: User;
	project: {
		id: string;
		url: string;
		name?: string;
		logo?: string;
		colors?: string[];
	};
}

export default function JoinForm({ user, project }: JoinFormProps) {
	const router = useRouter();
	const [currentState, setCurrentState] = useState<
		false | "submitting" | "error" | "submitted"
	>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const { data: formData, isPending: isFormPending } = trpc.getPublishedForm.useQuery({
		projectId: project.id,
	});
	const submitMutation = trpc.submitAnswers.useMutation();

	const fields = useMemo(() => formData?.fields ?? [], [formData]);
	const sections = useMemo(() => formData?.sections ?? [], [formData]);

	const visibleFields = useMemo(() => fields.filter((f) => f.isVisible), [fields]);
	const groupedSections = useMemo(
		() => groupFieldsBySection(visibleFields, sections),
		[visibleFields, sections],
	);

	const dynamicSchema = useMemo(() => {
		return buildAnswersSchema(
			fields.map((f) => ({
				key: f.key,
				label: f.label,
				type: f.type,
				required: f.required,
				options: f.options,
				allowOther: f.allowOther,
				validation: f.validation,
				isVisible: f.isVisible,
				isActive: f.isActive,
			})),
		);
	}, [fields]);

	const schema = useMemo(
		() =>
			z.object({
				name: z
					.string({ error: "Obrigatório" })
					.min(2, { message: "Informe seu nome completo." })
					.refine((v) => v.trim().split(/\s+/).length >= 2, {
						message: "Informe nome e sobrenome.",
					}),
				answers: dynamicSchema,
			}),
		[dynamicSchema],
	);

	const form = useForm<{ name: string; answers: Record<string, unknown> }>({
		resolver: zodResolver(schema as never),
		defaultValues: { name: user?.name || "", answers: {} },
	});

	useEffect(() => {
		if (user?.name) form.setValue("name", user.name);
	}, [user?.name, form]);

	useEffect(() => {
		if (!user) form.setValue("name", "");
	}, [user, form]);

	async function onSubmit(values: { name: string; answers: Record<string, unknown> }) {
		setCurrentState("submitting");
		if (!user) {
			setErrorMessage("Você precisa estar logado para se inscrever.");
			setCurrentState("error");
			return;
		}
		try {
			await submitMutation.mutateAsync({
				projectId: project.id,
				name: values.name,
				answers: values.answers as Record<string, string | number | boolean | string[] | null | undefined>,
			});
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido");
			setCurrentState("error");
			return;
		}
		if (user.id) await revalidateParticipantEnrollment(user.id);
		setCurrentState("submitted");
	}

	return (
		<Form {...form}>
			<FormWrapper>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<JoinForm0
						projectUrl={project.url}
						form={form as unknown as GenericForm}
						email={user?.email}
					/>
					{isFormPending ? (
						<FormSection
							title="Dados da inscrição"
							section={1}
							form={form as unknown as GenericForm}
							fields={[]}
						>
							<p className="text-muted-foreground text-sm">Carregando formulário do evento...</p>
							<SectionFooter isFinalSection />
						</FormSection>
					) : groupedSections.length === 0 ? (
						<FormSection
							title="Dados da inscrição"
							section={1}
							form={form as unknown as GenericForm}
							fields={[]}
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											Nome completo <span className="text-destructive ml-1">*</span>
										</FormLabel>
										<FormControl>
											<Input placeholder="Fulano da Silva" {...field} value={field.value ?? ""} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<p className="text-muted-foreground text-sm">
								Este evento não exige informações adicionais.
							</p>
							<SectionFooter isFinalSection />
						</FormSection>
					) : (
						groupedSections.map((group, gi) => (
							<FormSection
								key={group.section.id}
								title={group.section.title}
								section={gi + 1}
								form={form as unknown as GenericForm}
								fields={group.fields.map((f) => ({ name: f.label, value: false }))}
							>
								{gi === 0 && (
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem className="w-full">
												<FormLabel>
													Nome completo <span className="text-destructive ml-1">*</span>
												</FormLabel>
												<FormControl>
													<Input placeholder="Fulano da Silva" {...field} value={field.value ?? ""} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
								<div className="flex w-full flex-col gap-6">
									{group.rows.map((row, ri) => (
										<div
											key={row.fields.map((f) => f.id).join("-") || `row-${ri}`}
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
								<SectionFooter isFinalSection={gi === groupedSections.length - 1} />
							</FormSection>
						))
					)}
				</form>
			</FormWrapper>
			<LoadingDialog isOpen={currentState === "submitting"} title="Estamos realizando seu cadastro..." />
			<SuccessDialog
				isOpen={currentState === "submitted"}
				onClose={() => {
					setCurrentState(false);
					router.push(`/${project.url}/my`);
				}}
				confettiColors={project.colors}
				className="py-8 sm:!max-w-[40vw]"
				title={
					<div className="flex flex-col items-center justify-center gap-4">
						<span className="flex w-full sm:px-12">
							🎉 Parabéns! <br /> Sua inscrição
							{project.name ? ` em ${project.name}` : ""} foi confirmada com sucesso!
						</span>
					</div>
				}
				description="Você já pode acessar sua conta e se inscrever nas atividades do evento."
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				title="Erro ao enviar o formulário"
				onClose={() => {
					setCurrentState(false);
					setErrorMessage(null);
				}}
				description={errorMessage || "Por favor, tente novamente mais tarde."}
			/>
		</Form>
	);
}
