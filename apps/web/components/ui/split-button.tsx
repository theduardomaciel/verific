"use client";

import * as React from "react";

import { ChevronDownIcon } from "lucide-react";

import { Button, type buttonVariants } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";

import type { VariantProps } from "class-variance-authority";

type SplitButtonOption = {
	value: string;
	label: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	disabled?: boolean;
};

type SplitButtonProps = VariantProps<typeof buttonVariants> & {
	options: SplitButtonOption[];
	/** Controlled value. */
	value?: string;
	/** Uncontrolled initial value (defaults to the first option). */
	defaultValue?: string;
	/** Fired when the user picks a different option. Does not run the action. */
	onValueChange?: (value: string) => void;
	/** Fired when the main part is clicked, with the current value. */
	onAction?: (value: string) => void;
	disabled?: boolean;
	className?: string;
	menuClassName?: string;
	menuAlign?: "start" | "center" | "end";
	"aria-label"?: string;
};

function SplitButton({
	options,
	value: valueProp,
	defaultValue,
	onValueChange,
	onAction,
	variant = "default",
	size = "default",
	disabled,
	className,
	menuClassName,
	menuAlign = "end",
	"aria-label": ariaLabel = "Mais opções",
}: SplitButtonProps) {
	const [internal, setInternal] = React.useState(
		defaultValue ?? options[0]?.value ?? "",
	);
	const isControlled = valueProp !== undefined;
	const value = isControlled ? valueProp : internal;
	const current = options.find((o) => o.value === value) ?? options[0];
	const hasMultiple = options.length > 1;

	const select = (next: string) => {
		if (!isControlled) setInternal(next);
		onValueChange?.(next);
	};

	const bordered = variant === "outline" || variant === "event-cta";

	return (
		<div
			data-slot="split-button"
			className={cn("inline-flex items-stretch", className)}
		>
			<Button
				variant={variant}
				size={size}
				disabled={disabled}
				onClick={() => current && onAction?.(current.value)}
				className={cn(
					"relative focus-visible:z-10",
					hasMultiple && "rounded-r-none",
				)}
			>
				{current?.icon}
				{current?.label}
			</Button>

			{hasMultiple && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant={variant}
							size={size}
							disabled={disabled}
							aria-label={ariaLabel}
							className={cn(
								"relative rounded-l-none px-2 has-[>svg]:px-2 focus-visible:z-10",
								bordered
									? "-ml-px"
									: "border-l border-l-current/25",
							)}
						>
							<ChevronDownIcon />
						</Button>
					</DropdownMenuTrigger>

					<DropdownMenuContent
						align={menuAlign}
						className={cn("min-w-48", menuClassName)}
					>
						<DropdownMenuRadioGroup
							value={value}
							onValueChange={select}
						>
							{options.map((o) => (
								<DropdownMenuRadioItem
									key={o.value}
									value={o.value}
									disabled={o.disabled}
								>
									<OptionContent option={o} />
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}

function OptionContent({ option }: { option: SplitButtonOption }) {
	return (
		<div className="flex items-center gap-2">
			{option.icon}
			<div className="flex flex-col">
				<span>{option.label}</span>
				{option.description && (
					<span className="text-muted-foreground text-xs">
						{option.description}
					</span>
				)}
			</div>
		</div>
	);
}

export { SplitButton, type SplitButtonOption, type SplitButtonProps };
