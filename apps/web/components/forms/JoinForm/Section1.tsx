"use client";

// Components
import {
	FormSection,
	SectionFooter,
	type GenericForm,
} from "@/components/forms";
import { Combobox } from "@/components/ui/combobox";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input, PhoneInput } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Validation
import { isValid } from "@/lib/validations";
import {
	type JoinFormSection1Schema,
	joinFormSection1Schema,
} from "@/lib/validations/forms/join-form/section1";
import { degreeLevelLabels, degreeLevels } from "@verific/drizzle/enum/degree";
import { courses, periods } from "@verific/drizzle/schema";

const section1Keys = Object.keys(
	joinFormSection1Schema.shape,
) as (keyof JoinFormSection1Schema)[];

const formTitles = {
	name: "Nome completo",
	course: "Curso",
	registrationId: "Nº de matrícula",
	period: "Período",
	degreeLevel: "Nível de formação",
	phoneNumber: "Telefone",
};

export default function JoinForm1({ form }: { form: GenericForm }) {
	const section1 = section1Keys
		.filter((key) => key in formTitles)
		.map((key) => {
			return {
				name: formTitles[key as keyof typeof formTitles],
				value: isValid(key, 1, form),
			};
		});

	const hasActiveAcademicFormation = form.watch(
		"section1.hasActiveAcademicFormation",
	);

	return (
		<FormSection
			title="Dados Pessoais"
			section={1}
			form={form}
			fields={section1}
		>
			<FormField
				control={form.control}
				name="section1.name"
				render={({ field }) => (
					<FormItem className="w-full">
						<FormLabel>{formTitles.name}</FormLabel>
						<FormControl>
							<Input placeholder="Fulano da Silva" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="section1.phoneNumber"
				render={({ field }) => (
					<FormItem className="w-full">
						<FormLabel>{formTitles.phoneNumber}</FormLabel>
						<FormControl>
							<PhoneInput
								type="tel"
								placeholder="(xx) xxxxx-xxxx"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<div className="flex w-full flex-col items-start justify-between gap-6 lg:flex-row">
				<FormField
					control={form.control}
					name="section1.course"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>{formTitles.course}</FormLabel>
							<FormControl>
								<Combobox
									items={[
										{ label: "Nenhum", value: undefined },
										...courses.map((course) => ({
											label: course,
											value: course,
										})),
									]}
									emptyMessage="Nenhum curso encontrado."
									searchMessage="Pesquise um curso..."
									placeholder="Selecione um curso"
									disabled={hasActiveAcademicFormation}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="section1.registrationId"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>{formTitles.registrationId}</FormLabel>
							<FormControl>
								<Input
									type="number"
									placeholder="12345678"
									disabled={hasActiveAcademicFormation}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
			<div className="flex w-full flex-col items-start justify-between gap-6 lg:flex-row">
				<FormField
					control={form.control}
					name="section1.degreeLevel"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>{formTitles.degreeLevel}</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
								disabled={hasActiveAcademicFormation}
							>
								<FormControl>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Selecione o nível" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{degreeLevels.map((degree) => (
										<SelectItem key={degree} value={degree}>
											{degreeLevelLabels[degree]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="section1.period"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>{formTitles.period}</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
								disabled={hasActiveAcademicFormation}
							>
								<FormControl>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Selecione o período" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{periods.map((period) => (
										<SelectItem key={period} value={period}>
											{period == "0"
												? "Outro"
												: `${period}º período`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
			<FormField
				control={form.control}
				name="section1.hasActiveAcademicFormation"
				render={({ field }) => (
					<FormItem className="flex flex-row items-start space-y-0 space-x-3">
						<FormControl>
							<Checkbox
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						</FormControl>
						<div className="space-y-1 leading-none">
							<FormLabel>
								Não possuo formação acadêmica ativa
							</FormLabel>
						</div>
					</FormItem>
				)}
			/>
			<SectionFooter />
		</FormSection>
	);
}
