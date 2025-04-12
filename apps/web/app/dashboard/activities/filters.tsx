"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

export function Filters() {
	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-4">
				<div className="relative">
					<Input placeholder="Filtrar por nome" className="pl-10" />
				</div>
				<Select defaultValue="all">
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Filtrar por tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						<SelectItem value="lecture">Palestras</SelectItem>
						<SelectItem value="workshop">Workshops</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Button className="w-full">Aplicar Filtros</Button>
		</div>
	);
}
