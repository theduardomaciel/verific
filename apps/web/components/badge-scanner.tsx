"use client";

import { useState } from "react";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { toast } from "sonner";

// Icons
import { BarcodeIcon, Loader2, XIcon } from "lucide-react";

// Components
import { FullScreenDrawer } from "@/components/ui/fullscreen-drawer";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";

interface Props {
	activityId: string;
}

export function BadgeScanner({ activityId }: Props) {
	const [isLoading, setIsLoading] = useState(false);
	const [open, setOpen] = useState(false);

	const mutation = trpc.updateParticipantPresence.useMutation();

	async function handleScan(result: IDetectedBarcode[]) {
		setIsLoading(true);

		const participantId = result[0]?.rawValue;

		if (!participantId) {
			toast.error("Erro ao escanear o QR Code");
			setIsLoading(false);
			return;
		}

		try {
			await mutation.mutateAsync({
				participantId,
				activityId,
			});

			console.log(result);
			toast.success("Participante credenciado com sucesso!");
			setOpen(false);
		} catch (error) {
			console.error("Error updating participant presence:", error);
			toast.error("Erro ao credenciar o participante.");
			setIsLoading(false);
			return;
		}
	}

	return (
		<>
			<Button
				className="flex w-full md:hidden"
				size="lg"
				onClick={() => {
					console.log("abrindo");
					setOpen(true);
				}}
			>
				<BarcodeIcon />
				Escanear crachás
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
						Escaneie o QR Code para credenciar
					</p>
				</div>
				<Scanner
					onScan={handleScan}
					paused={!open}
					constraints={{
						facingMode: "environment",
						width: { ideal: 1280 },
						height: { ideal: 720 },
					}}
					/* styles={{
						container: {
							paddingTop: "2rem",
						},
					}} */
					/* components={{
						onOff: true,
						torch: true,
						zoom: true,
						finder: true,
					}} */
					// sound={true}
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
