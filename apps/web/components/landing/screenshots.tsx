import Image from "next/image";

import desktopLight from "@/public/screenshots/dashboard-desktop-light.png";
import desktopDark from "@/public/screenshots/dashboard-desktop.png";

import mobileLight from "@/public/screenshots/dashboard-mobile-light.png";
import mobileDark from "@/public/screenshots/dashboard-mobile.png";

export function Screenshots() {
	return (
		<section className="px-landing flex w-full justify-center pt-6 pb-8 lg:pb-16">
			<div className="container flex w-full flex-col gap-6 lg:flex-row">
				<div className="bg-primary hidden h-[472px] w-full items-end justify-center overflow-hidden rounded-2xl px-10 pt-14 md:flex lg:w-[71.4%]">
					<Image
						src={desktopDark}
						alt="Dashboard desktop"
						className="hidden h-full object-contain object-bottom dark:flex"
					/>
					<Image
						src={desktopLight}
						alt="Dashboard desktop"
						className="flex h-full object-contain object-bottom dark:hidden"
					/>
				</div>
				<div className="bg-primary flex h-[472px] max-h-[472px] flex-1 items-end justify-center overflow-hidden rounded-2xl px-10 pt-14 md:hidden lg:flex">
					<Image
						src={mobileDark}
						alt="Dashboard mobile"
						width={810}
						height={472}
						className="hidden h-full object-contain object-bottom dark:flex"
					/>
					<Image
						src={mobileLight}
						alt="Dashboard mobile"
						width={810}
						height={472}
						className="flex h-full object-contain object-bottom dark:hidden"
					/>
				</div>
			</div>
		</section>
	);
}
