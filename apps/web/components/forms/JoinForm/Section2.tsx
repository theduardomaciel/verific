"use client";

// Components
import {
	FormSection,
	SectionFooter,
	ResearchHeader,
	type GenericForm,
} from "@/components/forms";
import {
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Validation
import { isValid } from "@/lib/validations";
import {
	type JoinFormSection2Schema,
	joinFormSection2Schema,
} from "@/lib/validations/forms/join-form/section2";

const section2Keys = Object.keys(
	joinFormSection2Schema.shape,
) as (keyof JoinFormSection2Schema)[];

const formTitles = {
	reason: "Pergunta 1",
	discovery: "Pergunta 2",
	accessibility: "Pergunta 3",
	discoveryOther: undefined,
};

export default function JoinForm2({ form }: { form: GenericForm }) {
	const otherIsSelected = form.watch("section2.discovery") === "other";

	const section2 = section2Keys.map((key) => {
		return {
			name: formTitles[key],
			value: isValid(key, 2, form),
		};
	});

	return (
		<FormSection title="Pesquisa" section={2} form={form} fields={section2}>
			<FormField
				control={form.control}
				name="section2.reason"
				render={({ field }) => (
					<FormItem className="w-full">
						<ResearchHeader index={1}>
							&quot;O que fez você se inscrever no evento?&quot;
						</ResearchHeader>
						<FormControl>
							<Textarea
								placeholder=""
								className="resize-y"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<div className="flex w-full flex-col items-start justify-start gap-2">
				<FormField
					control={form.control}
					name="section2.discovery"
					render={({ field }) => (
						<FormItem className="w-full">
							<ResearchHeader index={2}>
								&quot;Por onde você descobriu o evento?&quot;
							</ResearchHeader>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
							>
								<FormControl>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Escolha uma opção" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="social_media">
										Redes sociais
									</SelectItem>
									<SelectItem value="friends">
										Amigos
									</SelectItem>
									<SelectItem value="other">Outro</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				{otherIsSelected && (
					<FormField
						control={form.control}
						name="section2.discoveryOther"
						render={({ field }) => (
							<FormItem className="w-full">
								<Input
									className="w-full"
									placeholder="Outro meio"
									{...field}
								/>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
			</div>
			<FormField
				control={form.control}
				name="section2.accessibility"
				render={({ field }) => (
					<FormItem className="w-full">
						<ResearchHeader index={1}>
							&quot;Você tem alguma necessidade especial de
							acessibilidade? Caso precise, cite-a no campo
							abaixo: &quot;
						</ResearchHeader>
						<FormControl>
							<Textarea
								placeholder=""
								className="resize-y"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<SectionFooter isFinalSection />
		</FormSection>
	);
}
