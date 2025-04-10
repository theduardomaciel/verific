import { ToDo } from "@/components/ToDo";

export default async function Overview() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center">
			<ToDo />
		</main>
	);
}
