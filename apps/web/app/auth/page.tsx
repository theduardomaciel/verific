// Icons
import Logo from "@/public/logo.svg";

// Components
import GoogleButton from "@/components/auth/GoogleButton";

export default function LoginPage() {
	return (
		<div className="flex flex-col md:flex-row min-h-screen">
			<div className="md:flex md:w-1/2 md:m-8 rounded-b md:rounded bg-primary relative overflow-hidden p-12 flex-col justify-center md:justify-between bg-[linear-gradient(180deg,_#2563EB_0%,_#3B82F6_100%)]">
				<h1 className="font-dashboard text-secondary font-extrabold text-6xl leading-16 tracking-normal">
					Tecnologia de eventos ao seu alcance
				</h1>

				<div className="relative z-10 flex flex-col gap-6 text-white">
					<Logo className="w-[139.828125px] h-[33.5390625px] gap-[11.39px]" />
					<p className="hidden md:flex font-normal text-xs leading-none tracking-normal text-secondary opacity-80">
						Copyright 2025 verifIC. Todos os direitos reservados
					</p>
				</div>
			</div>

			{/* Right Part */}
			<div className="w-full md:w-1/2 flex items-center justify-center p-8">
				<div className="max-w-md w-full">
					<h3 className="font-dashboard foreground text-2xl font-bold mb-2 text-center">
						Autenticação
					</h3>

					<p className="text-muted-foreground text-sm mb-8 text-center">
						Entre com seu e-mail institucional para
						<br />
						acessar a plataforma
					</p>

					{/* Botão de login com Google */}
					<GoogleButton />

					<p className="text-muted-foreground text-sm mb-8 text-center">
						Ao continuar, você concorda com nossos
						<br />
						<a
							href="/terms-of-service"
							className="text-muted-foreground text-sm mb-8 underline"
						>
							Termos de Serviço
						</a>{" "}
						e{" "}
						<a
							href="/privacy-policy"
							className="text-muted-foreground text-sm mb-8 underline"
						>
							Política de Privacidade
						</a>
						.
					</p>
				</div>
			</div>
		</div>
	);
}
