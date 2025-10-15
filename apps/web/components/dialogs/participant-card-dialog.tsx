"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

// Components
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface Props {
	children: ReactNode;
	trigger?: ReactNode;
}

export function ParticipantCardDialog({ children, trigger }: Props) {
	const [isOpen, setIsOpen] = useState(true);
	const router = useRouter();

	return (
		<Dialog
			open={trigger ? undefined : isOpen}
			onOpenChange={
				trigger
					? undefined
					: (open) => {
							setIsOpen(open);
							if (!open) {
								setTimeout(() => {
									router.back();
								}, 100);
							}
						}
			}
		>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent
				className="gap-6 overflow-y-scroll sm:max-w-[600px]"
				// hasCloseButton={false}
			>
				{children}
			</DialogContent>
		</Dialog>
	);
}
