"use client";

import React from "react";
import { Share2 } from "lucide-react";
import { ShareDialog } from "@/components/dialogs/share-dialog";

interface Props {
	children: React.ReactElement;
	shareData: {
		title: string;
		text?: string;
		url: string;
	};
}

export function ActivityShare({ children, shareData }: Props) {
	const handleShare = async () => {
		if (typeof navigator !== "undefined" && navigator.share) {
			try {
				await navigator.share(shareData);
			} catch (err) {
				// Optionally handle error
			}
		}
	};

	const clonedChildren = React.cloneElement(children, {
		onClick: handleShare,
		children: (
			<>
				<Share2 className="h-5 w-5" />
				<span>Compartilhar</span>
			</>
		),
	} as any);

	if (typeof navigator !== "undefined" && !navigator.share) {
		return (
			<ShareDialog
				url={shareData.url}
				title="Compartilhar Evento"
				description="Use o QR code ou copie o link para compartilhar o evento"
			>
				{clonedChildren}
			</ShareDialog>
		);
	}

	return clonedChildren;
}
