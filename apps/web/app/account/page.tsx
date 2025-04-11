import { EventList } from "@/components/account/EventList";

export default function Home() {
	return (
		<div className="flex flex-col min-h-screen bg-default">
			<main className="flex-1 flex items-center justify-center">
				<EventList />
			</main>
		</div>
	);
}
