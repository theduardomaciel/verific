import Image from "next/image";
import { Badge } from "../ui/badge";

import Cover from "@/public/screenshots/cover.png";

export function ProjectDeletePreview() {
	return (
		<div className="bg-background mt-4 flex flex-row justify-between gap-4 rounded-md border p-4 text-sm shadow-sm">
			<div className="flex flex-row items-center gap-6">
				<Image
					src={Cover}
					alt="Preview do evento"
					className="text-destructive"
				/>
				<div className="flex flex-col items-start justify-start">
					<p>SECOMP 2025</p>
					<p>Criado em 12/11/2024</p>
				</div>
			</div>
			<div className="flex flex-row items-center justify-end gap-4">
				<Badge
					variant="destructive"
					className="bg-destructive/80 rounded-full"
				>
					14 atividades
				</Badge>
				<Badge
					variant="destructive"
					className="bg-destructive/80 rounded-full"
				>
					153 participantes
				</Badge>
			</div>
		</div>
	);
}
