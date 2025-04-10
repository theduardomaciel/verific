import { Fragment, type ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";

export default function AppLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<Fragment>
			<Header />
			{children}
			<Footer />
		</Fragment>
	);
}
