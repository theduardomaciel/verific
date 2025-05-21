"use client";

import { Panel, type PanelProps } from "@/components/forms";
import Link from "next/link";

interface Error {
	type: PanelProps["type"];
	content: React.ReactNode;
}

const ERRORS: { [key: string]: Error } = {
	AuthorizedCallbackError: {
		type: "info",
		content: (
			<>
				Eita! Pelo visto você não inseriu um e-mail institucional...
				<br />
				<strong>
					Para ingressar nesse evento é necessário ser discente do IC.
				</strong>
				<br />
				Caso você não faça parte mas deseja se envolver em nossas
				atividades, confira os{" "}
				<Link
					className="hover:text-primary-100 underline"
					href={"/events"}
				>
					Eventos abertos ao público
				</Link>
				!
			</>
		),
	},
	PermissionLevelError: {
		type: "error",
		content: (
			<>
				Você não possui permissão para acessar essa página.
				<br />
				<strong>
					Se você acredita que isso é um erro, entre em contato com a
					administração.
				</strong>
			</>
		),
	},
	NotAuthenticated: {
		type: "error",
		content: (
			<>
				Somente <strong>membros cadastrados no IChess</strong> podem
				acessar essa página.
			</>
		),
	},
	default: {
		type: "error",
		content: (
			<>
				Ocorreu um erro inesperado. Por favor, tente novamente mais
				tarde.
			</>
		),
	},
};

export function ErrorDisplay({ error }: { error?: string }) {
	const errorObj = ERRORS[error as keyof typeof ERRORS] || ERRORS.default!;

	return (
		<Panel
			className="text-muted-foreground text-left text-sm leading-relaxed"
			type={errorObj.type}
			showIcon
		>
			{errorObj.content}
		</Panel>
	);
}
