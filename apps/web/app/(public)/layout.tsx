import { Fragment, type ReactNode } from "react";

import { Footer } from "@/components/Footer";

export default function AppLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<Fragment>
			{/* HEADER */}
			{children}
			<Footer />
		</Fragment>
	);
}
