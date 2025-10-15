"use client";

// Icons
import { ArrowRightIcon, CheckIcon, Share2Icon } from "lucide-react";

// Components
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
	const [hasCopied, setHasCopied] = useState(false);
	const [open, setOpen] = useState(false);

	const shareData = { title, text: description, url };

	const handleClick = async (e: React.MouseEvent) => {
		if (navigator.share) {
			try {
				await navigator.share(shareData);
			} catch (err) {
				toast.error("Erro ao compartilhar");
			}
		} else {
			setOpen(true);
		}
	};

	function copyLink() {
		navigator.clipboard.writeText(url);

		toast.message("Link copiado", {
			description: "O link foi copiado para a área de transferência",
		});

		setHasCopied(true);
	}

	useEffect(() => {
		if (hasCopied) {
			setTimeout(() => {
				setHasCopied(false);
			}, 1000);
		}
	}, [hasCopied]);

	/* const trigger = React.cloneElement(
		children as React.ReactElement,
		{
			onClick: handleClick,
		} as any,
	); */

	return (
		<>
			<div onClick={handleClick}>{children}</div>
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
						<Button
							className="bg-muted flex h-auto max-w-full px-4 py-2 text-left whitespace-normal"
							variant={"secondary"}
							onClick={copyLink}
						>
							<p className="text-neutral text-sm font-medium break-all">
								{url}
							</p>
							<div className="relative min-w-5">
								<Share2Icon
									className={cn(
										"absolute top-1/2 left-1/2 h-5 w-5 min-w-5 -translate-x-1/2 -translate-y-1/2 scale-100 transition-transform",
										{
											"scale-0": hasCopied,
										},
									)}
								/>
								<CheckIcon
									className={cn(
										"absolute top-1/2 left-1/2 h-5 w-5 min-w-5 -translate-x-1/2 -translate-y-1/2 scale-0 transition-transform",
										{
											"scale-100": hasCopied,
										},
									)}
								/>
							</div>
						</Button>
					</div>

					<DialogFooter className="w-full sm:justify-start">
						<DialogClose asChild>
							<Button
								className="w-full"
								type="button"
								size={"lg"}
							>
								<ArrowRightIcon className="-scale-100" />
								Fechar
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
