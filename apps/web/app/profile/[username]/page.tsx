import Link from "next/link";

import * as EventContainer from "@/components/landing/event-container";
import { Card } from "@/components/ui/card";

import GithubIcon from "@/public/icons/github.svg";
import InstagramIcon from "@/public/icons/instagram.svg";
import {
	CakeIcon,
	GraduationCapIcon,
	MailIcon,
	MapPinIcon,
	SettingsIcon,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

const userSocials = [
	{
		icon: GithubIcon,
		url: "https://github.com/jessica",
	},
	{
		icon: InstagramIcon,
		url: "https://instagram.com/jessica",
	},
	{
		icon: MailIcon,
		url: "mailto:jessica@verific.com",
	},
];

const userStats = {
	birthday: "1990-01-01",
	location: "Maceió, AL",
	institution: "Universidade Federal de Alagoas - UFAL",
	badgesAmount: 12,
};

const userConnections = [
	{
		id: 1,
		name: "John Doe",
		profilePicture: "https://github.com/john.png",
	},
	{
		id: 2,
		name: "Jane Doe",
		profilePicture: "https://github.com/jane.png",
	},
	{
		id: 3,
		name: "Fernanda",
		profilePicture: "https://github.com/fernanda.png",
	},
	{
		id: 4,
		name: "Marcelo",
		profilePicture: "https://github.com/marcelo.png",
	},
	{
		id: 5,
		name: "Carlos",
		profilePicture: "https://github.com/carlos.png",
	},
	{
		id: 6,
		name: "Giovana",
		profilePicture: "https://github.com/giovana.png",
	},
	{
		id: 7,
		name: "+30",
		profilePicture: null,
	},
];

const getUsernameFromUrl = (url: string) => {
	try {
		const parsed = new URL(url);

		if (parsed.protocol === "mailto:") {
			return parsed.pathname;
		}

		return parsed.pathname.split("/").filter(Boolean).pop() ?? "";
	} catch {
		return url.split("/").pop()?.replace(/\?.*$/, "") ?? "";
	}
};

const getAge = (birthday: string) => {
	const birthDate = new Date(birthday);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		age--;
	}
	return age;
};

const getFirstConnectionsNames = (connections: typeof userConnections) => {
	return connections.slice(0, 3).map((connection) => connection.name);
};

export default function ProfilePage() {
	return (
		<EventContainer.Holder>
			<header
				className={"container-d top-0 z-50 flex w-full justify-start"}
			>
				<Link href="/" className="py-8">
					<img
						src={"/logo.svg"}
						alt="Logo placeholder for testing"
						className="h-8 invert"
					/>
				</Link>
			</header>

			<EventContainer.Content>
				<div className="container-d mb-8 flex w-full flex-col gap-4 md:gap-12">
					<header className="from-primary to-secondary relative flex w-full flex-col items-start justify-start gap-4 rounded-3xl bg-linear-to-l p-8 md:h-96">
						<img
							src="https://github.com/jessica.png"
							alt="Profile picture"
							className="h-24 w-24 rounded-full"
						/>
						<div className="flex flex-col items-start justify-start gap-2">
							<h1 className="text-3xl font-bold">
								Jessica Soares
							</h1>
							<h2 className="text-primary-foreground/80 text-lg font-normal">
								Estudante de Psicologia
							</h2>
						</div>
						<p className="md:max-w-3/4">
							Lorem ipsum dolor sit amet, consectetur adipiscing
							elit. Donec tincidunt lorem neque, ut tempor metus
							sodales nec. Vivamus ut vestibulum quam. Duis
							laoreet at metus id suscipit. Mauris sagittis
							vulputate est at facilisis. Nulla tempor orci erat.
						</p>
						<ul className="flex flex-row flex-wrap items-start justify-start gap-4">
							{userSocials.map((social) => (
								<li key={social.url}>
									<a
										className="bg-foreground/10 flex flex-row items-center justify-start gap-2 rounded-md px-2 py-1.5 text-sm leading-none font-medium"
										href={social.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										<social.icon width={16} height={16} />
										<span>
											{getUsernameFromUrl(social.url)}
										</span>
									</a>
								</li>
							))}
						</ul>

						<Button
							variant="ghost"
							size="lg"
							className="from-primary/50 to-secondary/80 bg-background absolute top-8 right-8 rounded-full bg-linear-to-l"
						>
							<SettingsIcon />
							Editar perfil
						</Button>
					</header>

					{/* PROFILE */}
					<div className="flex flex-col items-start justify-center gap-6">
						<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
							<Card className="rounded-3xl p-6 font-medium md:p-9">
								<ul className="flex flex-col gap-4">
									<li className="flex flex-row items-center justify-start gap-3">
										<CakeIcon size={24} />
										<span>
											{getAge(userStats.birthday)} anos,{" "}
											{new Date(
												userStats.birthday,
											).toLocaleDateString("pt-BR", {
												month: "long",
												day: "numeric",
												year: "numeric",
											})}
										</span>
									</li>
									<li className="flex flex-row items-center justify-start gap-3">
										<MapPinIcon size={24} />
										<span>{userStats.location}</span>
									</li>
									<li className="flex flex-row items-center justify-start gap-3">
										<GraduationCapIcon size={24} />
										<span>{userStats.institution}</span>
									</li>
								</ul>
							</Card>
							{/* TODO: Badges are a completely placeholder for now */}
							<div className="from-primary/50 to-secondary/60 flex flex-row items-center justify-between gap-6 rounded-3xl bg-linear-to-l p-6 md:p-9">
								<span className="text-xl font-medium">
									<span className="text-3xl font-semibold">
										Adesivos
									</span>{" "}
									<br />
									Coletados
								</span>
								<span className="mx-auto text-5xl font-bold md:pl-24">
									{userStats.badgesAmount}
								</span>
							</div>
						</div>
						{/* TODO: Connections are also not implemented yet. A user connects to another from the event after visiting their profile */}
						<Card className="w-full items-start rounded-3xl p-6 md:flex-row md:items-center md:justify-between md:p-9">
							<div className="flex flex-col items-start gap-2">
								<h6 className="text-xl font-semibold">
									Conexões no evento
								</h6>
								<p className="text-base font-medium">
									<strong>Jessica Soares</strong> já se
									conectou com{" "}
									{getFirstConnectionsNames(
										userConnections,
									).join(", ")}{" "}
									e outras {userConnections.length - 3}{" "}
									pessoas
								</p>
							</div>
							<ul className="flex flex-row">
								{userConnections.map((connection) => (
									<li
										key={connection.id}
										className="not-first:-ml-2"
									>
										{connection.profilePicture ? (
											<img
												src={connection.profilePicture}
												alt={connection.name}
												className="bg-background h-10 w-10 rounded-full md:h-16 md:w-16"
											/>
										) : (
											<span className="bg-background flex h-10 w-10 items-center justify-center rounded-full text-xs leading-none font-semibold md:h-16 md:w-16 md:text-lg">
												{connection.name}
											</span>
										)}
									</li>
								))}
							</ul>
						</Card>
					</div>

					{/* ACTIVITIES LIST */}
					<h6 className="text-xl font-semibold">Seus eventos</h6>
				</div>
			</EventContainer.Content>

			<div className="container-d flex w-full items-center justify-center py-6">
				<div className="bg-primary w-full rounded-xl md:rounded-full">
					<Footer
						className="border-none px-4 py-4 text-white md:px-12"
						showWatermark
					/>
				</div>
			</div>
		</EventContainer.Holder>
	);
}
