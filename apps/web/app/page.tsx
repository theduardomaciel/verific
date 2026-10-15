import { Header } from "@/components/header/landing-header";
import { Faq } from "@/components/landing/faq";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Features } from "@/components/landing/features";
import { LandingFooter } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Screenshots } from "@/components/landing/screenshots";
import { TrustedBy } from "@/components/landing/trusted-by";

export default function Home() {
	return (
		<main
			id="about"
			className="bg-background flex min-h-screen w-full flex-col items-center"
		>
			<Header
				links={[
					{ href: "#about", label: "Sobre o projeto" },
					{ href: "#features", label: "Funcionalidades" },
					{ href: "#faq", label: "FAQ" },
				]}
			/>
			<Hero />
			<Screenshots />
			<TrustedBy />
			<Features />
			<FeatureCards />
			<Faq />
			<LandingFooter />
		</main>
	);
}
