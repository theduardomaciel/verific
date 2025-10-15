import React, { useEffect, useState } from "react";

// Icons
import { Share2Icon, CheckIcon } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Libs
import { cn } from "@/lib/utils";

interface ShareFieldProps {
	url: string;
	className?: string;
}

export function ShareField({ url, className }: ShareFieldProps) {
	const [hasCopied, setHasCopied] = useState(false);

	function copyLink() {
		navigator.clipboard.writeText(url);
		toast.info("Link copiado", {
			description: "O link foi copiado para a área de transferência",
		});
		setHasCopied(true);
	}

	useEffect(() => {
		if (hasCopied) {
			const timeout = setTimeout(() => setHasCopied(false), 1000);
			return () => clearTimeout(timeout);
		}
	}, [hasCopied]);

	return (
		<Button
			className={cn(
				"bg-muted flex h-auto max-w-full px-4 py-2 text-left whitespace-normal",
				className,
			)}
			variant={"secondary"}
			onClick={copyLink}
		>
			<p className="text-neutral text-sm font-medium break-all">{url}</p>
			<div className="relative min-w-5">
				<Share2Icon
					className={cn(
						"absolute top-1/2 left-1/2 h-5 w-5 min-w-5 -translate-x-1/2 -translate-y-1/2 scale-100 transition-transform",
						{ "scale-0": hasCopied },
					)}
				/>
				<CheckIcon
					className={cn(
						"absolute top-1/2 left-1/2 h-5 w-5 min-w-5 -translate-x-1/2 -translate-y-1/2 scale-0 transition-transform",
						{ "scale-100": hasCopied },
					)}
				/>
			</div>
		</Button>
	);
}
