"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// Icons
import { LoaderCircle } from "lucide-react";
// Forms
import {
	FormProvider,
	useForm,
	type Resolver,
	type UseFormReturn,
} from "react-hook-form";

// Validations
import type z from "@verific/zod";

// Components
import { Button } from "@/components/ui/button";

import {
	SettingsCard,
	type SettingsCardFooterProps,
} from "@/components/settings/settings-card";

interface SettingsFormCardProps<
	T extends z.ZodType<Record<string, any>, Record<string, any>>,
> {
	schema: T;
	title: string;
	description: string;
	initialState: Partial<z.output<T>>;
	onSubmit: (form: UseFormReturn<z.output<T>>) => void | Promise<void>;
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
		resolver: zodResolver(schema) as unknown as Resolver<z.output<T>, any>,
		defaultValues: initialState as any,
	});

	// Subscribe to all form changes to trigger re-renders on field updates
	// This ensures renderField is called with updated values when user interacts with pickers
	// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: subscribe to all form changes
	form.watch();

	const { isSubmitting, isDirty } = form.formState;

	return (
		<FormProvider {...form}>
			<form
				onSubmit={(e) =>
					void form.handleSubmit(() => void onSubmit(form))(e)
				}
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
