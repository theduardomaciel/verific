"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface ParticipantItemProps {
	participant: any;
	isSelected: boolean;
	onToggle: (checked: boolean) => void;
}

export function ParticipantItem({
	participant,
	isSelected,
	onToggle,
}: ParticipantItemProps) {
	return (
		<li className="flex w-full flex-row items-center justify-between">
			<div className="flex flex-row items-center justify-start gap-4">
				<Avatar className="h-9 w-9">
					<AvatarImage
						src={participant.user?.image_url || undefined}
					/>
					<AvatarFallback>
						<User className="h-5 w-5" />
					</AvatarFallback>
				</Avatar>
				<span className="text-neutral text-left text-base leading-tight font-semibold">
					{participant.user?.name ?? `@${participant.id}`}
				</span>
			</div>
			<div className="flex flex-row items-center justify-end gap-4">
				{participant.user?.name && (
					<span className="text-neutral hidden text-xs leading-none font-semibold opacity-50 md:flex">
						@{participant.user?.email?.split("@")[0]}
					</span>
				)}
				<Checkbox
					id={participant.id}
					name={participant.id}
					className="h-6 w-6"
					checked={isSelected}
					onCheckedChange={onToggle}
				/>
			</div>
		</li>
	);
}
