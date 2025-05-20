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

export default function JoinForm0({
	form,
	email,
}: {
	form: GenericForm;
	email?: string | null;
}) {
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
					<FormItem>
						<FormLabel>E-mail institucional</FormLabel>
						<GoogleButton
							disabled={!!email}
							className="w-full py-[1.35rem]"
							callbackUrl="/join"
						/>
						{email && <Logged email={email} />}
						<FormMessage /* type="warning" showIcon */ />
					</FormItem>
				)}
			/>
			<SectionFooter />
		</FormSection>
	);
}
