import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FullScreenDrawerProps {
	open?: boolean;
	onClose?: () => void;
	children?: ReactNode;
	className?: string;
	closeButton?: ReactNode; // Novo prop para customização do botão
}

// ou SlideOverScreen
export function FullScreenDrawer({
	open: openProp,
	onClose,
	children,
	className,
	closeButton,
}: FullScreenDrawerProps) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		if (openProp !== undefined) setOpen(openProp);
		else setOpen(true);
		return () => setMounted(false);
	}, [openProp]);

	function handleClose() {
		setOpen(false);
		onClose?.();
	}

	const drawer = (
		<div
			role="dialog"
			aria-modal="true"
			className={cn(
				`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-all duration-500`,
				open
					? "visible opacity-100"
					: "pointer-events-none invisible opacity-0",
				className,
			)}
		>
			<div
				className={cn(
					`bg-background relative flex h-full max-h-none w-full max-w-none translate-x-0 flex-col rounded-none shadow-xl transition-transform duration-500 ease-in-out`,
					open ? "translate-x-0" : "translate-x-full",
				)}
				style={{ minHeight: "100dvh" }}
			>
				{closeButton ? (
					<div
						className="absolute top-4 right-4 z-10"
						onClick={handleClose}
					>
						{closeButton}
					</div>
				) : (
					<button
						onClick={handleClose}
						className="focus:ring-primary absolute top-4 right-4 z-10 rounded-full bg-white/80 p-2 hover:bg-white focus:ring-2 focus:outline-none"
						aria-label="Fechar"
					>
						<XIcon className="text-muted-foreground h-6 w-6" />
					</button>
				)}
				<div className="relative flex flex-1 flex-col overflow-auto">
					{children}
				</div>
			</div>
		</div>
	);

	if (!mounted) return null;
	return createPortal(drawer, document.body);
}
