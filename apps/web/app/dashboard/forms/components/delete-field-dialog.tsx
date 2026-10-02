"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Field } from "../types";

interface DeleteFieldDialogProps {
	field: Field | null;
	isPending: boolean;
	onClose: () => void;
	onConfirm: (field: Field) => void;
}

export function DeleteFieldDialog({
	field,
	isPending,
	onClose,
	onConfirm,
}: DeleteFieldDialogProps) {
	return (
		<Dialog
			open={!!field}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>Excluir campo</DialogTitle>
					<DialogDescription>
						{field ? (
							<>
								Tem certeza que deseja excluir o campo{" "}
								<span className="font-semibold">
									“{field.label}”
								</span>
								? Essa ação não pode ser desfeita.
							</>
						) : (
							"Tem certeza que deseja excluir este campo? Essa ação não pode ser desfeita."
						)}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							if (field) onConfirm(field);
						}}
						disabled={isPending}
					>
						{isPending ? "Excluindo..." : "Excluir campo"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
