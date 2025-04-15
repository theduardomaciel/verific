"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const switchVariants = cva(
	"peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			size: {
				default: "h-[1.15rem] w-8",
				lg: "h-7 w-[50px]",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

const switchThumbVariants = cva(
	"bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-[2px]",
	{
		variants: {
			size: {
				default: "size-4",
				lg: "size-6",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

interface SwitchProps
	extends React.ComponentProps<typeof SwitchPrimitive.Root>,
		VariantProps<typeof switchVariants> {}

function Switch({ className, size, ...props }: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(switchVariants({ size, className }))}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(switchThumbVariants({ size }))}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
