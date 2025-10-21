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
import { useForm, UseFormReturn, Resolver } from "react-hook-form";
import { FormProvider } from "react-hook-form";

// Validations
import z from "@verific/zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface SettingsFormCardProps<
	T extends z.ZodType<Record<string, any>, Record<string, any>>,
> {
	schema: T;
	title: string;
	description: string;
	initialState: Partial<z.output<T>>;
	onSubmit: (form: UseFormReturn<z.output<T>>) => void;
	renderField: (form: UseFormReturn<z.output<T>>) => React.ReactNode;
	footer?: {
		text?: SettingsCardFooterProps["text"];
		action?: {
			label: string;
			variant: "default" | "destructive";
		};
	};
}

export function SettingsFormCard<
	T extends z.ZodType<Record<string, any>, Record<string, any>>,
>({
	schema,
	title,
	description,
	initialState,
	onSubmit,
	renderField,
	footer,
}: SettingsFormCardProps<T>) {
	const form = useForm<z.output<T>, any, z.output<T>>({
		resolver: zodResolver(schema) as Resolver<z.output<T>, any>,
		defaultValues: initialState as any,
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
