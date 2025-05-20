"use client";

// Components
import {
	FormSection,
	SectionFooter,
	type GenericForm,
} from "@/components/forms";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const section1Keys = Object.keys(
	joinFormSection1Schema.shape,
) as (keyof JoinFormSection1Schema)[];

const formTitles = {
	name: "Nome completo",
	course: "Curso",
	registrationId: "Nº de matrícula",
	period: "Período",
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
					<FormItem>
						<FormLabel>{formTitles.name}</FormLabel>
						<FormControl>
							<Input placeholder="Fulano da Silva" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<div className="flex w-full flex-col items-center justify-between gap-6 lg:flex-row">
				<FormField
					control={form.control}
					name="section1.course"
					render={({ field }) => (
						<FormItem className="space-y-3">
							<FormLabel>{formTitles.course}</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									defaultValue={field.value}
									className="flex flex-col space-y-2"
								>
									<FormItem className="flex items-center space-y-0 space-x-3">
										<FormControl>
											<RadioGroupItem value="cc" />
										</FormControl>
										<FormLabel className="font-normal">
											Ciência da Computação
										</FormLabel>
									</FormItem>
									<FormItem className="flex items-center space-y-0 space-x-3">
										<FormControl>
											<RadioGroupItem value="ec" />
										</FormControl>
										<FormLabel className="font-normal">
											Engenharia da Computação
										</FormLabel>
									</FormItem>
								</RadioGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="section1.registrationId"
					render={({ field }) => (
						<FormItem>
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
			<FormField
				control={form.control}
				name="section1.period"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{formTitles.period}</FormLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="Selecione o período" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								<SelectItem value="1">1º período</SelectItem>
								<SelectItem value="2">2º período</SelectItem>
								<SelectItem value="3">3º período</SelectItem>
								<SelectItem value="4">4º período</SelectItem>
								<SelectItem value="5">5º período</SelectItem>
								<SelectItem value="6">6º período</SelectItem>
								<SelectItem value="7">7º período</SelectItem>
								<SelectItem value="8">8+ período</SelectItem>
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
			<SectionFooter />
		</FormSection>
	);
}
