"use client";

// Icons
import { LoaderCircle } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import {
	SettingsCard,
	SettingsCardFooterProps,
} from "@/components/settings/settings-card";

// Forms
import { useForm, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

// Validations
import z, { ZodTypeAny } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface SettingsFormCardProps<T extends ZodTypeAny> {
	schema: T;
	title: string;
	description: string;
	initialState: any;
	onSubmit: (form: UseFormReturn<z.infer<T>>) => void;
	renderField: (form: UseFormReturn<z.infer<T>>) => React.ReactNode;
	footer?: {
		text?: SettingsCardFooterProps["text"];
		action?: {
			label: string;
			variant: "default" | "destructive";
		};
	};
}

export function SettingsFormCard<T extends ZodTypeAny>({
	schema,
	title,
	description,
	initialState,
	onSubmit,
	renderField,
	footer,
}: SettingsFormCardProps<T>) {
	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: initialState,
	});

	const { isSubmitting, isDirty } = form.formState;

	return (
		<FormProvider {...form}>
			<form
				onSubmit={form.handleSubmit(() => onSubmit(form))}
				className="space-y-0"
			>
				<SettingsCard
					title={title}
					description={description}
					footer={{
						text: footer?.text,
						action: (
							<Button
								type="submit"
								disabled={isSubmitting || !isDirty}
								variant={footer?.action?.variant ?? "default"}
							>
								{isSubmitting ? (
									<LoaderCircle
										size={16}
										className="animate-spin"
									/>
								) : (
									(footer?.action?.label ?? "Salvar")
								)}
							</Button>
						),
					}}
				>
					{renderField(form)}
				</SettingsCard>
			</form>
		</FormProvider>
	);
}
