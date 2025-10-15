"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import { Form, FormWrapper } from "@/components/ui/form";
import {
	ErrorDialog,
	LoadingDialog,
	SuccessDialog,
} from "@/components/forms/dialogs";

// Sections
import JoinForm0 from "./Section0";
import JoinForm1 from "./Section1";
import JoinForm2 from "./Section2";

// Validation
import {
	type JoinFormSchema,
	JoinFormTypeEnum,
	joinFormSchema,
} from "@/lib/validations/forms/join-form";
import { scrollToNextSection } from "@/lib/validations";

// Types
import type { User } from "@verific/auth";
import type { GenericForm } from "..";

// API
import { trpc } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function JoinForm({
	user,
	projectId,
	projectUrl,
	projectLogo,
}: {
	user?: User;
	projectId: string;
	projectUrl: string;
	projectLogo?: string;
}) {
	const router = useRouter();

	const [currentState, setCurrentState] = useState<
		false | "submitting" | "error" | "submitted"
	>(false);

	const mutation = trpc.updateUser.useMutation();

	// 1. Define your form.
	const form = useForm<JoinFormSchema>({
		resolver: zodResolver(joinFormSchema as any), // TODO: Fix this type
		defaultValues: {
			formType: JoinFormTypeEnum.Section0,
			section0: {
				email: user?.email || "",
			},
			section1: {
				name: user?.name || "",
				course: undefined,
				registrationId: "",
				period: undefined,
			},
			section2: {
				reason: undefined,
				discovery: undefined,
				discoveryOther: "",
				accessibility: undefined,
			},
		},
	});

	const formType = form.watch("formType");

	function setFormType(formType: JoinFormTypeEnum) {
		form.setValue("formType", formType);
	}

	async function submitData() {
		setCurrentState("submitting");

		if (!user) {
			console.error("User not found.");
			setCurrentState("error");
			return;
		}

		// ✅ This will be type-safe and validated.
		const values = form.getValues();
		console.log("values", values);

		// Send the data to the server.
		try {
			await mutation.mutateAsync({
				name: values.section1.name,
				course: values.section1.course,
				registrationId: values.section1.registrationId,
				period: values.section1.period,
				projectId,
				reason: values.section2.reason,
				accessibility: values.section2.accessibility,
				discovery: values.section2.discovery,
				discoveryOther: values.section2.discoveryOther,
			});
		} catch (error) {
			console.error(error);
			setCurrentState("error");
			return;
		}

		setCurrentState("submitted");
	}

	// 2. Define a submit handler.
	async function handleNextFormType() {
		console.log("handleNextFormType", formType);

		// Switch between form sections.
		switch (formType) {
			case "section0":
				setFormType(JoinFormTypeEnum.Section1);
				scrollToNextSection(1);
				break;
			case "section1":
				setFormType(JoinFormTypeEnum.Section2);
				scrollToNextSection(2);
				break;
			case "section2":
				submitData();
				break;
		}
	}

	return (
		<Form {...form}>
			<FormWrapper>
				<form
					onSubmit={form.handleSubmit(handleNextFormType, () => {
						console.log("Form error");
					})}
				>
					<JoinForm0
						callbackUrl={`/event/${projectId}/subscribe`}
						form={form as unknown as GenericForm}
						email={user?.email}
					/>
					<JoinForm1 form={form as unknown as GenericForm} />
					<JoinForm2 form={form as unknown as GenericForm} />
				</form>
			</FormWrapper>
			<LoadingDialog
				isOpen={currentState === "submitting"}
				title="Estamos realizando seu cadastro..."
			/>
			<SuccessDialog
				isOpen={currentState === "submitted"}
				onClose={() => {
					setCurrentState(false);
					router.push(`${`/${projectUrl}/my`}`);
				}}
				className="py-8 sm:!max-w-[40vw]"
				title={
					<div className="flex flex-col items-center justify-center gap-4">
						{/* {projectLogo && (
							<Image
								src={projectLogo}
								alt="Logo do evento"
								width={200}
								height={50}
							/>
						)} */}
						<span className="flex w-full sm:px-12">
							🎉 Parabéns! <br /> Sua inscrição na Secomp 2025 foi
							confirmada com sucesso!
						</span>
					</div>
				}
				description={
					<>
						Bem-vindo à Semana da Computação da UFAL! Prepare-se
						para mergulhar em 5 dias incríveis de aprendizado,
						diversão e conexões.
						<br />
						<br />
						<strong>O que te espera:</strong>
						<br />• 📚 <strong>Minicursos e Palestras:</strong>{" "}
						Aprenda sobre os mais diversos assuntos com instrutores
						e palestrantes especializados.
						<br />• 🏆 <strong>Competições:</strong> Conquiste
						prêmios, conheça pessoas incríveis e fortaleça suas
						habilidades em nossos campeonatos emocionantes.
						<br />• 🎮 <strong>Sala de Jogos:</strong> Divirta-se e
						conecte-se com outros estudantes em momentos de
						interação na nossa sala de jogos.
						<br />
						<br />
						📅 <strong>Data:</strong> 20 a 24 de outubro
						<br />
						📍 <strong>Local:</strong> Instituto de Computação, UFAL
						<br />
						<br />O evento é gratuito e aberto a todos. Estamos
						ansiosos para te ver lá! 🚀
					</>
				}
			/>
			<ErrorDialog
				isOpen={currentState === "error"}
				title="Erro ao enviar o formulário"
				onClose={() => setCurrentState(false)}
				description="Por favor, tente novamente mais tarde. Se o erro persistir, entre em contato com o suporte."
			/>
		</Form>
	);
}
