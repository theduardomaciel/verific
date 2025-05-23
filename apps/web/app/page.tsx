import { Header } from "@/components/header/landing-header";
import { Hero } from "@/components/landing/hero";
import { Screenshots } from "@/components/landing/screenshots";
import { TrustedBy } from "@/components/landing/trusted-by";
import { Features } from "@/components/landing/features";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/footer";

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
