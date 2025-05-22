import type React from "react";
import { cn } from "@/lib/utils";

export interface SettingsCardFooterProps {
	text?: string | React.ReactNode;
	action?: React.ReactNode;
}

interface SettingsCardProps {
	title: string;
	description?: React.ReactNode;
	headerRight?: React.ReactNode;
	children?: React.ReactNode;
	footer?: SettingsCardFooterProps;
	footerClassName?: string;
	className?: string;
	borderColor?: string;
}

export function SettingsCard({
	title,
	description,
	headerRight,
	children,
	footer,
	footerClassName,
	className,
	borderColor = "border-border",
}: SettingsCardProps) {
	return (
		<div
			className={cn(
				`border ${borderColor} mb-6 overflow-hidden rounded-lg`,
				className,
			)}
		>
			<div className="flex flex-col gap-3 p-6">
				<div className="mb-2 flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col items-start justify-start gap-2">
						<h2 className="text-foreground text-xl font-semibold">
							{title}
						</h2>
						<span>{description && description}</span>
					</div>
					{headerRight && <div>{headerRight}</div>}
				</div>
				{children}
			</div>
			{footer && (
				<div
					className={cn(
						"text-muted-foreground flex w-full flex-row items-center justify-between border-t p-4",
						borderColor,
						footerClassName,
					)}
				>
					{footer.text && <p className="text-sm">{footer.text}</p>}
					{footer.action}
				</div>
			)}
		</div>
	);
}
