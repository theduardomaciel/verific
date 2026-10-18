"use client";

import * as React from "react";

import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { Button, type buttonVariants } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
	onValueChange?: (value: string) => void;
	/** Fired when the main part is clicked, with the current value. */
	onAction?: (value: string) => void;
	/**
	 * true  → picking an option only changes the current value (Windows-style).
	 * false → picking an option runs `onAction` immediately and doesn't persist.
	 */
	persistSelection?: boolean;
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
	persistSelection = true,
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
				className="relative rounded-r-none focus-visible:z-10"
			>
				{current?.icon}
				{current?.label}
			</Button>

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
					{persistSelection ? (
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
					) : (
						options.map((o) => (
							<DropdownMenuItem
								key={o.value}
								disabled={o.disabled}
								onSelect={() => onAction?.(o.value)}
							>
								<OptionContent option={o} />
								{o.value === value && (
									<CheckIcon className="ml-auto" />
								)}
							</DropdownMenuItem>
						))
					)}
				</DropdownMenuContent>
			</DropdownMenu>
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
