// Icons
import Logo from "@/public/logo.svg";
import Ticket from "@/public/ticket.svg";

// Components
import GoogleButton from "@/components/auth/GoogleButton";
import Link from "next/link";

export default function LoginPage() {
	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<div className="bg-primary relative flex flex-col justify-center gap-4 overflow-hidden rounded-b bg-[linear-gradient(180deg,_#2563EB_0%,_#3B82F6_100%)] p-6 md:m-8 md:w-1/2 md:justify-between md:rounded md:p-12">
				<h1 className="font-dashboard text-secondary hidden text-4xl leading-[110%] font-extrabold tracking-normal md:flex md:text-5xl">
					Tecnologia de eventos ao seu alcance
				</h1>

				<Ticket className="absolute -right-48 bottom-48 rotate-12 text-white md:-bottom-36" />

				<div className="relative z-10 flex flex-col gap-3 text-white max-md:py-6 md:items-start">
					<Logo className="h-10 md:h-8" />
					<p className="text-secondary hidden text-xs leading-none font-normal tracking-normal opacity-80 md:flex">
						Copyright 2025 verifIC. Todos os direitos reservados
					</p>
				</div>
			</div>

			{/* Right Part */}
			<div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
				<div className="flex w-full max-w-sm flex-col items-center justify-center gap-6 max-md:pb-8">
					<div className="flex flex-col items-center justify-center gap-2">
						<h3 className="font-dashboard foreground mb-2 text-center text-2xl font-bold">
							Autenticação
						</h3>

						<p className="text-muted-foreground text-center text-sm">
							Entre com seu e-mail institucional para
							<br />
							acessar a plataforma
						</p>
					</div>

					{/* Botão de login com Google */}
					<Link href={"/dashboard"} className="w-full">
						<GoogleButton />
					</Link>

					<p className="text-muted-foreground text-center text-sm">
						Ao continuar, você concorda com nossos
						<br />
						<a
							href="/terms"
							className="text-muted-foreground hover:text-foreground text-sm hover:underline"
						>
							Termos de Serviço
						</a>{" "}
						e{" "}
						<a
							href="/privacy"
							className="text-muted-foreground hover:text-foreground text-sm hover:underline"
						>
							Política de Privacidade
						</a>
						.
					</p>
					<footer className="absolute bottom-0 left-1/2 flex w-full max-w-[50%] -translate-x-1/2 items-center justify-center pb-8 md:hidden">
						<p className="text-center text-xs opacity-20">
							Copyright 2025 verifIC. Todos os direitos reservados
						</p>
					</footer>
				</div>
			</div>
		</div>
	);
}
