import Image from "next/image";

import { IdCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
	name?: string;
	qrValue?: string;
	logoSrc: {
		light?: string | null;
		dark?: string | null;
	};
	primaryColor?: string;
	secondaryColor?: string;
	onGenerate?: () => void;
}

const DATA = {
	name: "Fulano da Silva",
	qrValue: "verifIC",
	logoSrc: {
		light: "/logo_blue.png",
		dark: "/logo_white.png",
	},
	primaryColor: "#1C63B7",
	secondaryColor: "#458AFF",
};

export default function BadgesGeneratorCallout({
	name = "Fulano da Silva",
	qrValue = "verifIC",
	logoSrc = {
		light: "/logo_blue.png",
		dark: "/logo_white.png",
	},
	primaryColor = "#1C63B7",
	secondaryColor = "#458AFF",
	onGenerate,
}: Props) {
	const nameStyle =
		primaryColor && secondaryColor
			? {
					backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
				}
			: undefined;
	return (
		<Card className="text-card-foreground w-full bg-transparent">
			<CardHeader className="items-center gap-6 text-center">
				<CardTitle className="px-4 text-2xl leading-tight font-semibold md:px-16">
					Gerar crachás de identificação
				</CardTitle>

				<Button
					onClick={onGenerate}
					className="mx-auto w-fit"
					size={"lg"}
				>
					<IdCard className="size-5" />
					Gerar crachás
				</Button>
			</CardHeader>

			<CardContent className="mx-auto flex max-w-md flex-col items-center pt-4">
				{/* Lanyard clip */}
				<div className="bg-muted-foreground relative z-10 -mb-6 flex h-27.5 w-17.5 items-start justify-center rounded-sm pt-6">
					<div className="bg-card size-9 rounded-full" />
				</div>

				{/* Badge */}
				<div className="bg-card flex w-full flex-col items-center rounded-2xl border border-neutral-700 px-8 pt-10 pb-8 shadow-sm">
					{logoSrc.light && (
						<Image
							src={logoSrc.light}
							alt="Logo do evento"
							className="h-8 w-auto object-contain dark:hidden"
							height={212}
							width={888}
						/>
					)}
					{logoSrc.dark && (
						<Image
							src={logoSrc.dark}
							alt="Logo do evento"
							className="hidden h-8 w-auto object-contain dark:flex"
							height={212}
							width={888}
						/>
					)}

					<h3
						style={nameStyle}
						className={
							nameStyle
								? "mt-5 bg-clip-text text-center text-3xl font-bold text-transparent"
								: "from-info via-success to-destructive mt-5 bg-linear-to-r bg-clip-text text-center text-3xl font-bold text-transparent"
						}
					>
						{name}
					</h3>

					{/* Text line placeholders */}
					<div className="mt-6 flex w-full flex-col gap-3">
						<div className="bg-secondary-foreground/50 h-3 w-[55%] rounded-full" />
						<div className="bg-secondary-foreground/50 h-3 w-[90%] rounded-full" />
					</div>

					<QRCodeSVG
						value={qrValue}
						bgColor="var(--card)"
						fgColor="var(--foreground)"
						size={128}
						level="M"
						className="mt-5"
						aria-label={`QR code do crachá de ${name}`}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
