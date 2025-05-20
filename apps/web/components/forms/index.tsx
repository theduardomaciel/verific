import { cn } from "@/lib/utils";

// Icons
import {
	ArrowRightIcon,
	CheckCircleIcon,
	InfoIcon,
	MessageCircleWarningIcon,
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";

// Types
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { JoinFormTypeEnum } from "@/lib/validations/JoinForm";

// Utils
import { scrollToNextSection } from "@/lib/validations";

export type GenericForm = UseFormReturn<FieldValues>;

interface FormSectionProps {
	title: string;
	section: number;
	form: GenericForm;
	fields: {
		name?: string;
		value?: boolean;
	}[];
	children?: React.ReactNode;
}

function FormSection({ form, children, ...rest }: FormSectionProps) {
	const formSection = form.watch("formType");
	const sectionNumber = Number(formSection?.replace("section", ""));

	const canSelect =
		!Number.isNaN(sectionNumber) && rest.section < sectionNumber;
	const isSelected =
		formSection === `section${rest.section}` ||
		(rest.section === 0 && !formSection);

	function handleSelect() {
		if (!isSelected && canSelect) {
			// Atualizamos o valor do formulário para o valor da seção atual
			form.setValue(
				"formType",
				`section${rest.section}` as JoinFormTypeEnum,
			);

			// Realizamos o scroll para a seção atual
			scrollToNextSection(rest.section);
		}
	}

	return (
		<div
			id={`section${rest.section}`}
			className={cn(
				"-mt-4 flex w-full flex-col items-start justify-start gap-9 pt-4 transition-opacity duration-300 ease-in-out lg:flex-row lg:gap-16",
				{
					"opacity-50 select-none": !isSelected,
					"pointer-events-none": !canSelect && !isSelected,
				},
			)}
		>
			<FormProgress {...rest} />
			<div
				className="relative flex w-full flex-col items-start justify-start gap-6 rounded-2xl border border-gray-200 p-6 md:p-9"
				onClick={handleSelect}
				onKeyUp={(e) => {
					if (e.key === "Enter") handleSelect();
				}}
			>
				{children}
			</div>
		</div>
	);
}

function FormProgress({
	title,
	section,
	fields,
}: Omit<FormSectionProps, "form">) {
	return (
		<div className="border-primary-100 top-4 left-0 flex w-full flex-col rounded-2xl border lg:sticky lg:w-2/5">
			<div className="bg-primary-100 flex flex-row items-center justify-start rounded-tl-2xl rounded-tr-2xl px-6 py-[18px]">
				<h6 className="text-base font-extrabold text-white lg:text-lg">
					{section + 1}. {title}
				</h6>
			</div>
			<ul className="flex flex-col items-start justify-start gap-4 px-6 py-[18px] md:px-9">
				{fields.map((field) => {
					if (!field.name) return null;

					return (
						<li
							key={field.name}
							className={cn(
								"text-neutral flex flex-row items-center justify-start gap-2 text-sm select-none lg:text-base",
								{
									"text-primary-200 opacity-50": field.value,
								},
							)}
						>
							{field.value && <CheckCircleIcon />}
							<span className="font-semibold">{field.name}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export interface PanelProps extends React.HTMLAttributes<HTMLParagraphElement> {
	className?: string;
	type?: "error" | "warning" | "info" | "success" | "success";
	showIcon?: boolean;
	children: React.ReactNode;
}

function Panel({
	className,
	type = "info",
	showIcon,
	children,
	...rest
}: PanelProps) {
	return (
		<div
			className={cn(
				"relative inline-flex w-full flex-row items-center justify-start gap-2.5 rounded-lg px-6 py-3 text-white",
				{
					"bg-tertiary-200 dark:bg-tertiary-200/50": type === "error",
					"bg-secondary-100 dark:bg-secondary-100/50":
						type === "warning",
					"bg-info-100 dark:bg-info-100/50": type === "info",
					"bg-primary-200 dark:bg-primary-200/50": type === "success",
				},
			)}
		>
			{showIcon &&
				{
					error: <MessageCircleWarningIcon />,
					warning: <MessageCircleWarningIcon />,
					info: <InfoIcon className="h-[18px] w-[18px]" />,
					success: <CheckCircleIcon />,
				}[type]}
			<p
				className={cn(
					"w-full shrink grow basis-0 text-left text-sm font-medium whitespace-pre-wrap",
					className,
				)}
				{...rest}
			>
				{children}
			</p>
		</div>
	);
}

interface SectionFooterProps {
	className?: string;
	isFinalSection?: boolean;
	children?: React.ReactNode;
}

function SectionFooter({
	className,
	isFinalSection = false,
	children,
}: SectionFooterProps) {
	return (
		<div
			className={cn(
				"flex w-full flex-row flex-wrap items-center justify-end gap-4",
				{
					"justify-between": !!children,
				},
				className,
			)}
		>
			{children}
			<Button
				className="bg-primary-200 h-12 w-full px-9 font-extrabold text-white md:w-fit"
				type="submit"
			>
				{isFinalSection ? (
					"Concluir"
				) : (
					<>
						Continuar
						<ArrowRightIcon />
					</>
				)}
			</Button>
		</div>
	);
}

function ResearchHeader({
	index,
	children,
}: {
	index: number;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-start justify-start gap-2">
			<div className="flex w-full flex-row items-center justify-between">
				<FormLabel>Pergunta {index}</FormLabel>
				<p className="text-muted/80 text-xs lg:text-sm">Opcional</p>
			</div>
			<FormLabel className="font-bold">{children}</FormLabel>
		</div>
	);
}

export { FormSection, FormProgress, Panel, SectionFooter, ResearchHeader };
