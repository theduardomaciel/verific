"use client";

import type React from "react";
import Link from "next/link";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
} from "@/components/ui/dialog";
import Confetti from "react-confetti-boom";

// Icons

interface Props {
	isOpen: boolean;
	onClose?: () => void;
	title?: string | React.ReactNode;
	description?: React.ReactNode;
	className?: string;
}

interface LoadingDialogProps extends Props {}

export function LoadingDialog({
	isOpen,
	title,
	description,
	className,
}: LoadingDialogProps) {
	return (
		<Dialog open={isOpen}>
			<DialogContent
				className={cn(
					"flex flex-col items-center justify-center overflow-y-auto pb-16 sm:max-w-[450px]",
					className,
				)}
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
				onEscapeKeyDown={(event) => {
					event.preventDefault();
				}}
			>
				<DialogHeader hasCloseButton={false}>
					<DialogTitle className="font-title text-center text-2xl font-extrabold break-words">
						{title || "Estamos quase lá!"}
					</DialogTitle>
				</DialogHeader>
				<DialogDescription className="max-w-[80%] text-center text-lg font-medium break-words">
					{description ||
						"Aguarde um pouquinho enquanto processamos tudo!"}
				</DialogDescription>
			</DialogContent>
		</Dialog>
	);
}

interface SuccessDialogProps extends Props {
	href?: string;
	buttonText?: string;
	confettiColors?: string[];
}

export function SuccessDialog({
	isOpen,
	onClose,
	href,
	title,
	description,
	buttonText,
	className,
	confettiColors,
}: SuccessDialogProps) {
	return (
		<Dialog open={isOpen}>
			{confettiColors && isOpen && (
				<div className="absolute top-0 left-0 h-screen w-screen">
					<Confetti
						mode="boom"
						particleCount={100}
						spreadDeg={60}
						launchSpeed={1.5}
						colors={confettiColors}
						className="z-100"
					/>
					<Confetti
						mode="fall"
						particleCount={50}
						colors={confettiColors}
					/>
				</div>
			)}
			<DialogContent
				className={cn(
					"flex max-h-[90vh] flex-col items-center justify-start overflow-y-auto py-16",
					className,
				)}
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
				onEscapeKeyDown={(event) => {
					event.preventDefault();
				}}
			>
				<DialogHeader
					className="flex flex-col items-center justify-center gap-4"
					hasCloseButton={false}
				>
					<Check />
					<DialogTitle className="font-title text-center text-2xl font-extrabold">
						{title || "Eba! Deu tudo certo!"}
					</DialogTitle>
				</DialogHeader>
				<DialogDescription className="max-w-[80%] text-center text-lg font-medium">
					{description || (
						<>
							O processo foi concluído com sucesso! <br />
							Agora você pode continuar navegando na plataforma.
						</>
					)}
				</DialogDescription>
				<DialogFooter>
					{href ? (
						<Button type="button" className="h-11 px-6" asChild>
							<Link href={href} replace prefetch={false}>
								{buttonText || "Entendi!"}
							</Link>
						</Button>
					) : (
						<Button
							type="button"
							className="h-11 px-6"
							onClick={onClose}
						>
							{buttonText || "Entendi!"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ErrorDialog({ isOpen, onClose, title, description }: Props) {
	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose?.();
				}
			}}
		>
			<DialogContent className="flex flex-col items-center justify-center overflow-y-auto py-16 sm:max-w-[450px]">
				<DialogHeader
					className="flex flex-col items-center justify-center gap-4"
					hasCloseButton={false}
				>
					<X width={56} height={56} />
					<DialogTitle className="font-title text-center text-2xl font-extrabold">
						{title || "Ops! Algo deu errado!"}
					</DialogTitle>
				</DialogHeader>
				<DialogDescription className="max-w-[80%] text-center text-lg font-medium whitespace-pre-line">
					{description || (
						<>
							Algo deu errado ao enviar seu cadastro. <br />
							Por favor, tente novamente mais tarde.
						</>
					)}
				</DialogDescription>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" className="h-11 px-6">
							Voltar
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// Texto de 3 pontinhos que muda indicando carregamento
/* function LoadingDots() {
	const [dots, setDots] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => (prev + 1) % 4);
		}, 300);
		return () => clearInterval(interval);
	}, []);

	return ".".repeat(dots);
} */
