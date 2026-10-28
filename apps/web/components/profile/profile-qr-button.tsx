"use client";

import { QrCode } from "lucide-react";

import { buildProfileUrl } from "@verific/badges/qr-payload";
import { appUrl } from "@verific/env";

import { Button } from "@/components/ui/button";

import { ShareDialog } from "@/components/dialogs/share-dialog";

import { cn } from "@/lib/utils";

interface ProfileQrButtonProps {
	eventUrl: string;
	shortId: string;
	className?: string;
}

/**
 * Botão do dono para exibir o mesmo QR do crachá físico. Serve para quando o
 * crachá é perdido: a equipe escaneia o código direto da tela.
 */
export function ProfileQrButton({
	eventUrl,
	shortId,
	className,
}: ProfileQrButtonProps) {
	// Mesmo payload do crachá: link público absoluto do perfil.
	const value = buildProfileUrl(appUrl, eventUrl, shortId);

	return (
		<ShareDialog
			url={value}
			title="Seu QR de credenciamento"
			description="Mostre este código à equipe caso tenha perdido o crachá."
			alwaysShowDialog
		>
			<Button
				variant="outline"
				size="lg"
				className={cn("rounded-full", className)}
			>
				<QrCode className="h-4 w-4" />
				Meu QR
			</Button>
		</ShareDialog>
	);
}
