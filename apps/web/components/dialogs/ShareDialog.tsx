"use client";

// Icons
import ShareIcon from "@/public/icons/share.svg";
import SuccessIcon from "@/public/icons/check.svg";
import ArrowRightIcon from "@/public/icons/arrow_right.svg";

// Components
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

// Hooks
import { useToast } from "@/hooks/use-toast";

// QR Code
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
	url: string;
}

export function ShareDialog({ url }: ShareDialogProps) {
	const [hasCopied, setHasCopied] = useState(false);
	const { toast } = useToast();

	function copyLink() {
		navigator.clipboard.writeText(url);

		toast({
			title: "Link copiado",
			description: "O link foi copiado para a área de transferência",
			variant: "success",
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

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size={"icon"} className="h-11 max-xs:w-full">
					<span className="flex xs:hidden">Compartilhar</span>
					<ShareIcon className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-lg overflow-y-scroll">
				<DialogHeader className="w-full">
					<DialogTitle>Compartilhar evento</DialogTitle>
					<DialogDescription>
						O link abaixo permite que os membros marquem presença no evento
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center justify-center w-full py-4 gap-6">
					<QRCodeSVG
						className="bg-white p-3 rounded-sm"
						value={url}
						width={200}
						height={200}
					/>
					<Button
						className="flex h-auto px-4 py-2 text-left bg-gray-300 whitespace-normal max-w-full"
						variant={"modal"}
						onClick={copyLink}
					>
						<p className="text-sm font-medium text-neutral break-all">{url}</p>
						<div className="relative min-w-5">
							<ShareIcon
								className={cn(
									"h-5 w-5 min-w-5 transition-transform scale-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
									{
										"scale-0": hasCopied,
									},
								)}
							/>
							<SuccessIcon
								className={cn(
									"h-5 w-5 min-w-5 transition-transform scale-0 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
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
						<Button className="w-full" type="button" size={"xl"}>
							<ArrowRightIcon className="-scale-100" />
							Voltar
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
