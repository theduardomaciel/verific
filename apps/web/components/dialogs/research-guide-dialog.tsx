"use client";
import { env } from "@verific/env";

// Components
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ShareField } from "../share-field";

interface Props {
	children: React.ReactNode;
}

export function ResearchGuideDialog({ children }: Props) {
	const clientEmail = env.NEXT_PUBLIC_GOOGLE_SHEET_CLIENT_EMAIL;

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="gap-4 sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Guia para Configurar Pesquisa</DialogTitle>
					<DialogDescription>
						Siga os passos abaixo para configurar a pesquisa no seu
						evento.
					</DialogDescription>
				</DialogHeader>
				<div
					className="space-y-6 overflow-y-auto"
					style={{ maxHeight: "65vh" }}
				>
					<Step1 />
					<Step2 clientEmail={clientEmail} />
					<Step3 />
					<Note />
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Fechar</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface StepProps {
	title: string;
	children: React.ReactNode;
}

function Step({ title, children }: StepProps) {
	return (
		<div>
			<h3 className="text-lg font-semibold">{title}</h3>
			<div className="text-muted-foreground text-sm">{children}</div>
		</div>
	);
}

function Step1() {
	return (
		<Step title="Passo 1: Criar uma Planilha no Google Sheets">
			<>
				Acesse{" "}
				<a
					href="https://sheets.google.com"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline"
				>
					Google Sheets
				</a>{" "}
				e crie uma nova planilha em branco.
			</>
		</Step>
	);
}

function Step2({ clientEmail }: { clientEmail?: string }) {
	return (
		<Step title="Passo 2: Compartilhar a Planilha">
			<>
				Clique no botão "Compartilhar" no canto superior direito da
				planilha. Adicione o seguinte email como editor:
				{/* <code className="bg-muted mt-2 block rounded p-2 text-sm">
					{clientEmail ||
						"NEXT_PUBLIC_GOOGLE_SHEET_CLIENT_EMAIL não configurado"}
				</code> */}
				<ShareField
					url={
						clientEmail ||
						"NEXT_PUBLIC_GOOGLE_SHEET_CLIENT_EMAIL não configurado"
					}
					className="text-muted-foreground bg-muted mt-2 w-full font-mono"
				/>
				{/* <span className="mt-2 block">{clientEmail}</span> */}
				<span className="mt-2 block">
					Certifique-se de que a permissão seja{" "}
					<strong>"Editor"</strong> para que o sistema possa gravar as
					respostas.
				</span>
			</>
		</Step>
	);
}

function Step3() {
	return (
		<Step title="Passo 3: Copiar o Link da Planilha">
			<>
				Após compartilhar, copie o link da planilha (clique em "Copiar
				link" no botão Compartilhar) e cole no campo "Link da planilha
				de respostas" nas configurações do evento. Em seguida, ative a
				opção "Incluir pesquisa".
			</>
		</Step>
	);
}

function Note() {
	return (
		<div className="rounded border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
			<p className="text-sm text-yellow-800 dark:text-yellow-200">
				<strong>Nota:</strong> O email acima é usado pelo sistema para
				salvar automaticamente as respostas da pesquisa. Certifique-se
				de que a planilha esteja acessível apenas para você e o sistema.
			</p>
		</div>
	);
}
