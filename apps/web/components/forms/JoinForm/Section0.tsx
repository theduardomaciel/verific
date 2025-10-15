"use client";

// Components
import {
	FormSection,
	SectionFooter,
	type GenericForm,
} from "@/components/forms";
import {
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";

import { Logged } from "@/components/auth/LoginStatus";

import GoogleButton from "@/components/auth/GoogleButton";

interface JoinForm0Props {
	projectUrl: string;
	form: GenericForm;
	email?: string | null;
}

export default function JoinForm0({ projectUrl, form, email }: JoinForm0Props) {
	return (
		<FormSection
			title="Identificação"
			section={0}
			form={form}
			fields={[
				{
					name: "E-mail institucional",
					value: !!email,
				},
			]}
		>
			<FormField
				control={form.control}
				name="section0.email"
				render={() => (
					<FormItem className="w-full">
						<FormLabel>E-mail institucional</FormLabel>
						{!email ? (
							<GoogleButton
								className="w-full"
								callbackUrl={`/${projectUrl}/subscribe`}
							/>
						) : (
							<Logged
								email={email}
								callbackUrl={`/${projectUrl}/subscribe`}
							/>
						)}
						<FormMessage type="warning" showIcon />
					</FormItem>
				)}
			/>
			<SectionFooter />
		</FormSection>
	);
}
