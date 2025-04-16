import { Fragment } from "react";

export default function Layout({
	children,
	modal,
}: {
	children: React.ReactNode;
	modal: React.ReactNode;
}) {
	return (
		<div>
			{modal}
			{children}
		</div>
	);
}
