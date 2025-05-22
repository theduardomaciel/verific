// (event)/[eventUrl]/schedule/layout.tsx

export default function ScheduleLayout({
	children,
	modal, // rota paralela
}: {
	children: React.ReactNode;
	modal: React.ReactNode;
}) {
	return (
		<>
			{children}
			{modal && modal}
		</>
	);
}
