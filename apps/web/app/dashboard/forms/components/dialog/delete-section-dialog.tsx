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
import type { Section } from "../../types";

interface DeleteSectionDialogProps {
	section: Section | null;
	fieldCount: number;
	isPending: boolean;
	onClose: () => void;
	onConfirm: (section: Section) => void;
}

export function DeleteSectionDialog({
	section,
	fieldCount,
	isPending,
	onClose,
	onConfirm,
}: DeleteSectionDialogProps) {
	return (
		<Dialog open={!!section} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Excluir seção?</DialogTitle>
					<DialogDescription>
						{section && (
							<>
								A seção “{section.title}” será removida.
								{fieldCount > 0 && (
									<>
										{" "}
										Ela possui {fieldCount} campo
										{fieldCount === 1 ? "" : "s"} — mova ou
										exclua os campos antes de excluir a
										seção.
									</>
								)}
							</>
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
						disabled={!section || isPending || fieldCount > 0}
						onClick={() => section && onConfirm(section)}
					>
						{isPending ? "Excluindo..." : "Excluir seção"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
