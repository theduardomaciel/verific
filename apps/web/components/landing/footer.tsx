import Link from "next/link";

import { ArrowRight } from "lucide-react";

// Components
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export function LandingFooter() {
	return (
		<div className="bg-muted flex w-full flex-col gap-10 rounded-t-3xl px-6 pt-6 pb-6 md:px-12 md:pt-16">
			<div className="flex w-full flex-col items-start justify-start gap-10 md:flex-row md:justify-between">
				<div className="flex flex-col items-start justify-start gap-6">
					<h6 className="!max-w-[60%] text-3xl font-bold">
						Organização fácil, prática e descomplicada.
					</h6>
					<Link href="/auth">
						<Button
							className="group text-foreground hover:bg-accent bg-input h-fit rounded-full !px-6 py-3"
							size={"lg"}
						>
							<span>Começar</span>
							<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
				<ul className="flex flex-row gap-4 space-x-8 max-md:w-full max-md:flex-wrap md:space-x-12">
					<FooterLinks
						title="Sobre"
						links={[
							{ label: "Nosso propósito", href: "/purpose" },
							{ label: "Nossa equipe", href: "/team" },
							{ label: "Carreira", href: "/career" },
						]}
					/>
					<FooterLinks
						title="Ajuda"
						links={[
							{ label: "Documentação", href: "/docs" },
							{ label: "Suporte", href: "/support" },
							{ label: "Blog", href: "/blog" },
						]}
					/>
				</ul>
			</div>
			<div className="bg-input w-full rounded-xl md:rounded-full">
				<Footer className="border-none px-4 py-4 md:px-12" />
			</div>
		</div>
	);
}

interface FooterLinksProps {
	title: string;
	links: {
		label: string;
		href: string;
	}[];
}

function FooterLinks({ title, links }: FooterLinksProps) {
	return (
		<div className="flex flex-col gap-2">
			<h6 className="text-lg font-bold">{title}</h6>
			<div className="flex flex-col gap-2">
				{links.map((link) => (
					<Link
						key={link.label}
						href={link.href}
						className="text-muted-foreground hover:text-foreground text-sm font-medium text-nowrap"
					>
						{link.label}
					</Link>
				))}
			</div>
		</div>
	);
}
