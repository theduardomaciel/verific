import { Hammer } from "lucide-react";

export function ToDo() {
	return (
		<div className="container-p flex w-full flex-1 flex-col items-center justify-center gap-6">
			<Hammer size={64} />
			<h1 className="font-title text-center text-4xl font-bold">
				Essa página ainda não está pronta!
			</h1>
			<p className="text-center">
				Mas não se preocupe, tudo está sendo preparado com muito carinho
				❤️
			</p>
		</div>
	);
}
