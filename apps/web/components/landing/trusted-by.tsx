import IC_Icon from "@/public/icons/ic.svg";
import LACOMP_Icon from "@/public/icons/lacomp.svg";
import UFAL_Icon from "@/public/icons/ufal.svg";

export function TrustedBy() {
	return (
		<section className="px-landing container py-8 md:py-12">
			<h2 className="text-muted-foreground mb-8 text-center text-lg">
				Confiado por instituições como
			</h2>
			<div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
				<IC_Icon className="object-contain" />

				<LACOMP_Icon className="object-contain" />

				<UFAL_Icon className="object-contain" />
			</div>
		</section>
	);
}
