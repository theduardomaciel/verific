import { Hammer } from "lucide-react";

export function ToDo() {
	return (
		<div className="flex flex-1 w-full flex-col items-center justify-center gap-6 px-dashboard">
			<Hammer size={64} />
			<h1 className="text-center font-title text-4xl font-bold">
				Essa página ainda não está pronta!
			</h1>
			<p className="text-center">
				Mas não se preocupe, tudo está sendo preparado com muito carinho ❤️
			</p>
		</div>
	);
}
