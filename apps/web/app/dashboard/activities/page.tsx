import { ToDo } from "@/components/to-do";

export default async function Overview() {
	return (
		<main className="flex flex-col items-center justify-center h-screen">
			<ToDo />
		</main>
	);
}
