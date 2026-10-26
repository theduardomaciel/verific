"use client";

import { createContext, use } from "react";

interface DashboardContextValue {
	projectId: string;
	projectUrl: string;
	/** `true` when the signed-in user owns the selected project. */
	isOwner: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
	projectId,
	projectUrl,
	isOwner,
	children,
}: DashboardContextValue & { children: React.ReactNode }) {
	return (
		<DashboardContext value={{ projectId, projectUrl, isOwner }}>
			{children}
		</DashboardContext>
	);
}

export function useDashboard() {
	const ctx = use(DashboardContext);

	if (!ctx) {
		throw new Error("useDashboard must be used within DashboardProvider");
	}

	return ctx;
}
