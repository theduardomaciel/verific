"use client";

// Icons
import { ArrowRightIcon } from "lucide-react";

// Components
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

// QR Code
import { QRCodeSVG } from "qrcode.react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ShareField } from "../share-field";

interface ShareDialogProps {
	children: React.ReactNode;
	url: string;
	title?: string;
	description?: string;
}

export function ShareDialog({
	url,
	children,
	title = "Compartilhar",
	description = "Use o QR code ou copie o link para compartilhar",
}: ShareDialogProps) {
	const [open, setOpen] = useState(false);

	const shareData = { title, text: description, url };

	const handleClick = async () => {
		if (navigator.share) {
			try {
				await navigator.share(shareData);
			} catch {
				toast.error("Erro ao compartilhar");
			}
		} else {
			setOpen(true);
		}
	};

	/* const trigger = React.cloneElement(
		children as React.ReactElement,
		{
			onClick: handleClick,
		} as any,
	); */

	return (
		<>
			<div
				role="button"
				tabIndex={0}
				aria-label={title}
				onClick={() => void handleClick()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						void handleClick();
					}
				}}
			>
				{children}
			</div>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="w-full overflow-y-scroll sm:max-w-lg">
					<DialogHeader className="w-full">
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>

					<div className="flex w-full flex-col items-center justify-center gap-6 py-4">
						<QRCodeSVG
							className="rounded-sm bg-white p-3"
							value={url}
							width={200}
							height={200}
						/>
						<ShareField url={url} className="w-full" />
					</div>

					<DialogFooter className="w-full sm:justify-start">
						<DialogClose
							className={cn(
								buttonVariants({ size: "lg" }),
								"w-full",
							)}
							type="button"
						>
							<ArrowRightIcon className="-scale-100" />
							Fechar
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
