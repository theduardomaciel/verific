"use client";
import React, { useActionState, useEffect } from "react";

// Components
import { Button } from "@/components/ui/button";
import {
	SettingsCard,
	type SettingsCardFooterProps,
} from "@/components/settings/settings-card";
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
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";

interface SettingsFormCardProps<T extends ZodTypeAny> {
	schema: T;
	fieldName: string;
	title: string;
	description: string;
	label: string;
	initialState: any;
	action: (data: any) => void;
	renderField: (field: any, form: any) => React.ReactNode;
	footer?:
		| ((isLoading: boolean) => SettingsCardFooterProps)
		| SettingsCardFooterProps;
}

// Função padrão para o footer
function defaultFooter(isLoading: boolean): SettingsCardFooterProps {
	return {
		action: (
			<Button type="submit" disabled={isLoading}>
				{isLoading ? (
					<LoaderCircle size={16} className="animate-spin" />
				) : (
					"Salvar"
				)}
			</Button>
		),
	};
}

export function SettingsFormCard<T extends ZodTypeAny>({
	schema,
	fieldName,
	title,
	description,
	label,
	initialState,
	action,
	renderField,
	footer,
}: SettingsFormCardProps<T>) {
	const pending = false;

	const form = useForm({
		resolver: zodResolver(schema),
	});

	const [state, formAction] = useActionState(action, initialState);

	useEffect(() => {
		if (state.errors) {
			Object.entries(state.errors).forEach(([field, message]) => {
				form.setError(field, { message: message as string });
			});
		}
	}, [state.errors]);

	// Permite footer como função, objeto completo ou apenas texto
	let footerProps: SettingsCardFooterProps;
	if (typeof footer === "function") {
		footerProps = footer(pending);
	} else if (footer && typeof footer === "object") {
		// Se só tem text, usa action padrão
		if (footer.text && !footer.action) {
			footerProps = {
				action: defaultFooter(pending).action,
				text: footer.text,
			};
		} else {
			footerProps = footer;
		}
	} else {
		footerProps = defaultFooter(pending);
	}

	return (
		<SettingsCard
			title={title}
			description={description}
			footer={footerProps}
		>
			<Form {...form}>
				<form action={formAction} className="space-y-0">
					<FormField
						control={form.control}
						name={fieldName}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{label}</FormLabel>
								<FormControl>
									{renderField(field, form)}
								</FormControl>
								<FormMessage>
									{state?.errors?.[fieldName]}
								</FormMessage>
							</FormItem>
						)}
					/>
				</form>
			</Form>
		</SettingsCard>
	);
}
