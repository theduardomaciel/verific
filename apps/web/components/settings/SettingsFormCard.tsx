"use client";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/settings-card";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";

// Validations
import { ZodTypeAny } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormState, useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

interface SettingsFormCardProps<T extends ZodTypeAny> {
	schema: T;
	fieldName: string;
	title: string;
	description: string;
	label?: string;
	initialState: any;
	onSubmit: (form: ReturnType<typeof useForm>) => void;
	renderField: (field: any) => React.ReactNode;
	footer?: {
		text?: string;
		action?: {
			label: string;
			variant: "default" | "destructive";
		};
	};
}

export function SettingsFormCard<T extends ZodTypeAny>({
	schema,
	fieldName,
	title,
	description,
	label,
	initialState,
	onSubmit,
	renderField,
	footer,
}: SettingsFormCardProps<T>) {
	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			[fieldName]: initialState,
		},
	});

	const { isSubmitting, isDirty } = form.formState;

	return (
		<Form {...form}>
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
					<FormField
						control={form.control}
						name={fieldName}
						render={({ field }) => (
							<FormItem>
								{label ? <FormLabel>{label}</FormLabel> : null}
								<FormControl>{renderField(field)}</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</SettingsCard>
			</form>
		</Form>
	);
}
