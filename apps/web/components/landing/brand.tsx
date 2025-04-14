import Link from "next/link";

import Logo from "@/public/logo.svg";

export function Brand() {
	return (
		<Link href="/">
			<Logo className="h-6" />
		</Link>
	);
}
