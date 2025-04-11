// Icons
import Logo from "@/public/logo.svg";
import Ticket from "@/public/ticket.svg";

// Components
import GoogleButton from "@/components/auth/GoogleButton";

export default function LoginPage() {
	return (
		<div className="flex flex-col md:flex-row min-h-screen">
			<div className="flex md:w-1/2 md:m-8 rounded-b md:rounded bg-primary relative overflow-hidden p-6 md:p-12 flex-col justify-center md:justify-between bg-[linear-gradient(180deg,_#2563EB_0%,_#3B82F6_100%)] gap-4">
				<h1 className="hidden md:flex font-dashboard text-secondary font-extrabold text-4xl md:text-5xl leading-[110%] tracking-normal">
					Tecnologia de eventos ao seu alcance
				</h1>

				<Ticket className="absolute -right-48 bottom-48 md:-bottom-36 text-white rotate-12" />

				<div className="relative z-10 flex md:items-start flex-col max-md:py-6 gap-3 text-white">
					<Logo className="h-10 md:h-8" />
					<p className="hidden md:flex font-normal text-xs leading-none tracking-normal text-secondary opacity-80">
						Copyright 2025 verifIC. Todos os direitos reservados
					</p>
				</div>
			</div>

			{/* Right Part */}
			<div className="w-full flex-1 md:w-1/2 flex flex-col items-center justify-center p-8">
				<div className="flex flex-col gap-6 items-center justify-center w-full max-w-sm max-md:pb-8">
					<div className="flex flex-col items-center justify-center gap-2">
						<h3 className="font-dashboard foreground text-2xl font-bold mb-2 text-center">
							Autenticação
						</h3>

						<p className="text-muted-foreground text-sm text-center">
							Entre com seu e-mail institucional para
							<br />
							acessar a plataforma
						</p>
					</div>

					{/* Botão de login com Google */}
					<GoogleButton />

					<p className="text-muted-foreground text-sm text-center">
						Ao continuar, você concorda com nossos
						<br />
						<a
							href="/terms-of-service"
							className="text-muted-foreground text-sm hover:text-foreground hover:underline"
						>
							Termos de Serviço
						</a>{" "}
						e{" "}
						<a
							href="/privacy-policy"
							className="text-muted-foreground text-sm hover:text-foreground hover:underline"
						>
							Política de Privacidade
						</a>
						.
					</p>
					<footer className="flex md:hidden w-full justify-center items-center absolute bottom-0 left-1/2 -translate-x-1/2 pb-8 max-w-[50%]">
						<p className="text-xs opacity-20 text-center">
							Copyright 2025 verifIC. Todos os direitos reservados
						</p>
					</footer>
				</div>
			</div>
		</div>
	);
}
