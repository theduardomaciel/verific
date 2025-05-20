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

// Validation
import { isValid } from "@/lib/validations";
import {
	type JoinFormSection1Schema,
	joinFormSection1Schema,
} from "@/lib/validations/JoinForm/section1";
import { courses, periods } from "@verific/drizzle/schema";

const section1Keys = Object.keys(
	joinFormSection1Schema.shape,
) as (keyof JoinFormSection1Schema)[];

const formTitles = {
	name: "Nome completo",
	course: "Curso",
	registrationId: "Nº de matrícula",
	period: "Período",
	phoneNumber: "Telefone",
};

export default function JoinForm1({ form }: { form: GenericForm }) {
	const section1 = section1Keys.map((key) => {
		return {
			name: formTitles[key],
			value: isValid(key, 1, form),
		};
	});

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
			<div className="flex w-full flex-col items-start justify-between gap-6 lg:flex-row">
				<FormField
					control={form.control}
					name="section1.course"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>{formTitles.course}</FormLabel>
							<FormControl>
								<Combobox
									items={courses.map((course) => ({
										label: course,
										value: course,
									}))}
									value={field.value}
									onChange={field.onChange}
									emptyMessage="Nenhum curso encontrado."
									searchMessage="Pesquise um curso..."
									placeholder="Selecione um curso"
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
									placeholder=""
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
					name="section1.period"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>{formTitles.period}</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
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
			</div>
			<SectionFooter />
		</FormSection>
	);
}
