import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Screenshots } from "@/components/landing/screenshots";
import { TrustedBy } from "@/components/landing/trusted-by";
import { Features } from "@/components/landing/features";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/footer";

export default function Home() {
	return (
		<main className="bg-background flex min-h-screen w-full flex-col items-center">
			<Header />
			<Hero />
			<Screenshots />
			<TrustedBy />
			<Features />
			<FeatureCards />
			<Faq />
			<Footer />
		</main>
	);
}
