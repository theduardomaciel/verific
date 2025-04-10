import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

interface Props {
	children: ReactNode;
	className?: string;
	asChild?: boolean;
}

export function Wrapper({ children, className, asChild }: Props) {
	const Comp = asChild ? Slot : "main";

	return (
		<Comp
			className={cn(
				"flex min-h-screen flex-col items-start justify-start gap-6 px-wrapper py-wrapper lg:py-[calc(var(--wrapper)/2)]",
				className,
			)}
		>
			{children}
		</Comp>
	);
}
