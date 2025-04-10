"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import clsx from "clsx";

import MenuIcon from "@/public/icons/menu.svg";
import { X } from "lucide-react";

// Components
import ThemePicker from "@/components/footer/subcomponents/ThemePicker";
import Status from "@/components/footer/subcomponents/Status";

const CENTER = "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";

interface Props {
	children?: React.ReactNode;
}

export function MobileMenu({ children }: Props) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const pathname = usePathname();
	const ref = useRef(pathname);
	const debounce = useRef(false);

	function managePage() {
		document.body.classList.toggle("overflow-hidden");
		document.body.classList.toggle("h-screen");
		document.getElementById("menuButton")?.classList.toggle("animate-pop");
		setTimeout(() => {
			document.getElementById("menuButton")?.classList.toggle("animate-pop");
			debounce.current = false;
		}, 500);
	}

	function toggleMenu() {
		if (debounce.current === false) {
			debounce.current = true;
			setIsMenuOpen(!isMenuOpen);
			managePage();
		}
	}

	useEffect(() => {
		if (ref.current !== pathname && isMenuOpen) {
			setIsMenuOpen(false);
			managePage();
			ref.current = pathname;
		}
	}, [isMenuOpen, pathname]);

	return (
		<>
			<div
				className={clsx(
					"flex flex-col w-screen max-w-full h-screen absolute top-0 left-0 z-40 transition bg-gray-500 pt-header px-wrapper items-center gap-y-16 justify-center sm:hidden",
					{
						"opacity-0 invisible": !isMenuOpen,
						"opacity-100 visible": isMenuOpen,
					},
				)}
				style={{
					contentVisibility: isMenuOpen ? "auto" : "hidden",
				}}
			>
				{children}
				<div className="flex flex-col items-center justify-center w-full gap-y-12 sm:hidden">
					<ThemePicker />
					{/* <Status /> */}
				</div>
			</div>
			<button
				type="button"
				onClick={toggleMenu}
				id="menuButton"
				className={"flex sm:hidden w-5 z-50 relative"}
			>
				<MenuIcon
					width={24}
					height={24}
					className={clsx("-rotate-0 transition-all absolute", CENTER, {
						"opacity-0 scale-0 -rotate-0": isMenuOpen,
						"opacity-100 scale-100 -rotate-0": !isMenuOpen,
					})}
				/>
				<X
					width={24}
					height={24}
					color="hsl(var(--neutral))"
					className={clsx("transition-all absolute ", CENTER, {
						"opacity-0 scale-0": !isMenuOpen,
						"opacity-100 scale-100": isMenuOpen,
					})}
				/>
			</button>
		</>
	);
}
