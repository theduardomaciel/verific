"use client";

import { useState } from "react";

import { Scanner } from "@yudiel/react-qr-scanner";
// Icons
import { BarcodeIcon, Loader2, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
// Components
import { FullScreenDrawer } from "@/components/ui/fullscreen-drawer";

import { trpc } from "@/lib/trpc/react";

import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

interface Props {
	/** Check-in de recepção (sem sessão). */
	projectId?: string;
	/** Sessão de atividade (credenciamento/saída). */
	sessionId?: string;
	mode?: "in" | "out" | "reception";
	buttonLabel?: string;
	buttonVariant?: "default" | "outline";
}

function extractCode(result: IDetectedBarcode[]): string | null {
	const code = result[0]?.rawValue?.trim();
	return code || null;
}

function successMessage(input: {
	name: string;
	pointsAwarded: number;
	unlockedStickers: Array<{ name: string }>;
	reception: boolean;
	out?: boolean;
	alreadyCheckedIn?: boolean;
	alreadyCheckedOut?: boolean;
	completed?: boolean;
}): string {
	const name = input.name;
	if (input.reception && input.alreadyCheckedIn) {
		return `${name} já fez check-in hoje.`;
	}
	if (!input.reception && input.alreadyCheckedOut) {
		return `A saída de ${name} já estava registrada.`;
	}

	const points =
		input.pointsAwarded > 0 ? ` · +${input.pointsAwarded} pts` : "";
	const sticker =
		input.unlockedStickers.length > 0
			? ` · adesivo ${input.unlockedStickers[0]!.name}`
			: "";

	if (input.reception) {
		return `${name} fez check-in${points}${sticker}`;
	}
	if (!input.out) {
		return `${name} credenciado${points}${sticker}`;
	}
	if (input.completed) {
		return `${name} concluiu a sessão${points}${sticker}`;
	}
	return `Saída de ${name} registrada${points}${sticker}`;
}

export function BadgeScanner({
	projectId,
	sessionId,
	mode = "in",
	buttonLabel,
	buttonVariant = "default",
}: Props) {
	const [isLoading, setIsLoading] = useState(false);
	const [open, setOpen] = useState(false);

	const utils = trpc.useUtils();
	const presenceMutation = trpc.updateSessionPresence.useMutation();
	const receptionMutation = trpc.checkInParticipant.useMutation();

	async function invalidate() {
		await Promise.all([
			utils.getActivitiesFromParticipant.invalidate(),
			utils.getActivity.invalidate(),
			utils.getReceptionSummary.invalidate(),
			utils.getParticipantGamification.invalidate(),
			utils.getEventRanking.invalidate(),
		]);
	}

	async function handleScan(result: IDetectedBarcode[]) {
		const code = extractCode(result);
		if (!code) {
			toast.error("Erro ao escanear o QR Code");
			return;
		}

		setIsLoading(true);
		try {
			if (mode === "reception") {
				if (!projectId) throw new Error("Evento não informado.");
				const checked = await receptionMutation.mutateAsync({
					projectId,
					code,
				});
				await invalidate();
				toast.success(
					checked.name
						? successMessage({
								name: checked.name,
								pointsAwarded: checked.pointsAwarded,
								unlockedStickers: checked.unlockedStickers,
								reception: true,
								alreadyCheckedIn: checked.alreadyCheckedIn,
							})
						: "Check-in registrado.",
				);
			} else {
				if (!sessionId) throw new Error("Sessão não informada.");
				const checked = await presenceMutation.mutateAsync({
					sessionId,
					code,
					mode: mode === "out" ? "out" : "in",
				});
				await invalidate();
				toast.success(
					successMessage({
						name: checked.name,
						pointsAwarded: checked.pointsAwarded,
						unlockedStickers: checked.unlockedStickers,
						reception: false,
						out: mode === "out",
						alreadyCheckedOut: checked.alreadyCheckedOut,
						completed: checked.completed,
					}),
				);
			}
			setOpen(false);
		} catch (error) {
			console.error("Error updating presence:", error);
			toast.error(
				mode === "reception"
					? "Erro ao fazer check-in."
					: mode === "out"
						? "Erro ao registrar saída."
						: "Erro ao credenciar o participante.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			<Button
				className="flex w-full"
				size="lg"
				variant={buttonVariant}
				onClick={() => setOpen(true)}
			>
				<BarcodeIcon />
				{buttonLabel ??
					(mode === "reception"
						? "Fazer check-in"
						: mode === "out"
							? "Registrar saída"
							: "Escanear crachás")}
			</Button>
			<FullScreenDrawer
				open={open}
				onClose={() => setOpen(false)}
				closeButton={
					<button
						className="focus:ring-primary rounded-full bg-white/80 p-2 hover:bg-white focus:ring-2 focus:outline-none"
						aria-label="Fechar"
					>
						<XIcon className="text-muted-foreground h-6 w-6" />
					</button>
				}
			>
				<div className="absolute top-32 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center gap-4">
					<p className="text-foreground text-center">
						{mode === "reception"
							? "Escaneie o QR do perfil para o check-in"
							: mode === "out"
								? "Escaneie o QR para registrar a saída"
								: "Escaneie o QR Code para credenciar"}
					</p>
				</div>
				<Scanner
					onScan={(result) => void handleScan(result)}
					paused={!open}
					constraints={{
						facingMode: "environment",
						width: { ideal: 1280 },
						height: { ideal: 720 },
					}}
					scanDelay={5000}
					allowMultiple={false}
					onError={(error) => {
						console.log("Error", error);
						toast.error(
							"Erro ao carregar a câmera para escanear o QR Code",
						);
					}}
				>
					{isLoading && (
						<Loader2
							size={64}
							className="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
						/>
					)}
				</Scanner>
			</FullScreenDrawer>
		</>
	);
}
