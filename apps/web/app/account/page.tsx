import { EventList } from "@/components/account/EventList";

export default function Home() {
	return (
		<main className="flex flex-1 items-center justify-center flex-col min-h-[calc(100vh-4rem)]">
			<EventList />
		</main>
	);
}
