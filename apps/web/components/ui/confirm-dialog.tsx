"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type ConfirmVariant = "default" | "destructive";

export interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: ConfirmVariant;
	isPending?: boolean;
	pendingLabel?: string;
	onConfirm: () => void;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirmar",
	cancelLabel = "Cancelar",
	confirmVariant = "default",
	isPending = false,
	pendingLabel,
	onConfirm,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? (
						<DialogDescription>{description}</DialogDescription>
					) : null}
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						{cancelLabel}
					</Button>
					<Button
						variant={confirmVariant}
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending && pendingLabel ? pendingLabel : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export interface ConfirmOptions {
	title: string;
	description?: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: ConfirmVariant;
}

/**
 * Imperative confirmation helper. Renders `<ConfirmDialog {...dialogProps} />`
 * once and calls `confirm(options)` wherever a confirmation is needed:
 *
 * ```tsx
 * const { confirm, dialogProps } = useConfirmDialog();
 * const ok = await confirm({ title: "Duplicar versão?" });
 * if (ok) onDuplicate(version);
 * return <ConfirmDialog {...dialogProps} />;
 * ```
 */
export function useConfirmDialog() {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const resolveRef = useRef<((value: boolean) => void) | null>(null);

	const confirm = useCallback((opts: ConfirmOptions) => {
		setOptions(opts);
		return new Promise<boolean>((resolve) => {
			resolveRef.current = resolve;
		});
	}, []);

	const settle = useCallback((result: boolean) => {
		setOptions(null);
		resolveRef.current?.(result);
		resolveRef.current = null;
	}, []);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) settle(false);
		},
		[settle],
	);

	const handleConfirm = useCallback(() => settle(true), [settle]);

	const dialogProps: ConfirmDialogProps = {
		open: options !== null,
		onOpenChange: handleOpenChange,
		title: options?.title ?? "",
		description: options?.description,
		confirmLabel: options?.confirmLabel,
		cancelLabel: options?.cancelLabel,
		confirmVariant: options?.confirmVariant,
		onConfirm: handleConfirm,
	};

	return { confirm, dialogProps };
}
