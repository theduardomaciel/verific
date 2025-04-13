import type React from "react";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
	title: string;
	description?: React.ReactNode;
	headerRight?: React.ReactNode;
	children?: React.ReactNode;
	footer?: {
		text?: string;
		action?: React.ReactNode;
	};
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
				`border ${borderColor} rounded-lg mb-6 overflow-hidden`,
				className,
			)}
		>
			<div className="flex flex-col p-6 gap-3">
				<div className="flex flex-wrap gap-4 justify-between items-start mb-2">
					<div className="flex flex-col items-start justify-start gap-2">
						<h2 className="text-xl font-semibold text-foreground">{title}</h2>
						<span>{description && description}</span>
					</div>
					{headerRight && <div>{headerRight}</div>}
				</div>
				{children}
			</div>
			{footer && (
				<div
					className={cn(
						"flex flex-row items-center justify-between text-muted-foreground p-4 border-t w-full",
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
