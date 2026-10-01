"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { isAfterEnd } from "@/lib/date";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

interface EventActionProps {
	eventUrl: string;
	endDate: Date | string;
	isArchived: boolean;
	isRegistrationEnabled: boolean;
}

export function EventAction({
	eventUrl,
	endDate,
	isArchived,
	isRegistrationEnabled,
}: EventActionProps) {
	const session = authClient.useSession();
	const userId = session.data?.user.id;
	const enrollment = trpc.checkParticipant.useQuery(
		{ projectUrl: eventUrl },
		{ enabled: Boolean(userId) },
	);
	const isParticipant = enrollment.data === true;
	const afterEnd = isAfterEnd(new Date(endDate));
	const isRegistrationOpen =
		isRegistrationEnabled && !isArchived && !afterEnd;

	let buttonText = "Inscrever-se";
	let href = `/${eventUrl}/subscribe`;
	let disabled = !isRegistrationOpen;

	if (isParticipant) {
		buttonText = "Ver programação";
		href = `/${eventUrl}/schedule`;
		disabled = isArchived || afterEnd;
	} else if (isArchived) {
		buttonText = "Evento arquivado";
	} else if (afterEnd) {
		buttonText = "Evento encerrado";
	} else if (!isRegistrationEnabled) {
		buttonText = "Inscrições fechadas";
	}

	if (session.isPending || (userId && enrollment.isPending)) {
		return <Button disabled>Carregando...</Button>;
	}

	if (disabled) {
		return <Button disabled>{buttonText}</Button>;
	}

	return (
		<Button asChild>
			<Link href={href}>{buttonText}</Link>
		</Button>
	);
}
