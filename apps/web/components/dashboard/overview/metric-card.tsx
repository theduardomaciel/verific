import type { ReactNode } from "react";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
	title: string;
	value: string;
	change: string;
	icon: ReactNode;
}

export function MetricCard({ title, value, change, icon }: MetricCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<div className="text-muted-foreground">{icon}</div>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-xs text-muted-foreground">{change}</p>
			</CardContent>
		</Card>
	);
}
