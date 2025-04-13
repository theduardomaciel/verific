"use client";

import { useTheme } from "next-themes";

// Components
import { SettingsCard } from "@/components/settings/settings-card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Computer, Moon, Sun } from "lucide-react";

export default function CustomizationSettings() {
	const { theme, setTheme } = useTheme();

	return (
		<>
			<SettingsCard
				title="Tema"
				description="Escolha o tema que você prefere usar."
			>
				<Select
					defaultValue={theme}
					onValueChange={(value) => setTheme(value)}
					disabled={false}
				>
					<SelectTrigger aria-label="Tema">
						<SelectValue placeholder="Selecione o tema" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="system">
							<Computer className="mr-2 h-4 w-4" />
							Sistema
						</SelectItem>
						<SelectItem value="light">
							<Sun className="mr-2 h-4 w-4" />
							Claro
						</SelectItem>
						<SelectItem value="dark">
							<Moon className="mr-2 h-4 w-4" />
							Escuro
						</SelectItem>
					</SelectContent>
				</Select>
			</SettingsCard>
		</>
	);
}
