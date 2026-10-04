import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getEventRegistration } from "@/lib/data";

interface EventActionProps {
	eventUrl: string;
}

/**
 * CTA principal da página do evento: estático e igual para todo visitante.
 * Participantes inscritos passam pela página de inscrição, que mostra
 * o aviso com o link da conta/perfil em vez do formulário.
 */
export async function EventAction({ eventUrl }: EventActionProps) {
	const registration = await getEventRegistration(eventUrl);

	let buttonText = "Inscrever-se";
	const disabled = !registration?.isOpen;

	if (registration?.isArchived) {
		buttonText = "Evento arquivado";
	} else if (!registration?.isRegistrationEnabled) {
		buttonText = "Inscrições fechadas";
	} else if (registration && !registration.isOpen) {
		buttonText = "Evento encerrado";
	}

	if (disabled) {
		return <Button disabled>{buttonText}</Button>;
	}

	return (
		<Button className="ev-button font-semibold uppercase" size={"xl"} asChild>
			<Link href={`/${eventUrl}/subscribe`}>{buttonText}</Link>
		</Button>
	);
}
