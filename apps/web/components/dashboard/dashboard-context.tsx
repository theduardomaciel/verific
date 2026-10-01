"use client";

import { createContext, useContext } from "react";

interface DashboardContextValue {
	projectId: string;
	projectUrl: string;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
	projectId,
	projectUrl,
	children,
}: DashboardContextValue & { children: React.ReactNode }) {
	return (
		<DashboardContext.Provider value={{ projectId, projectUrl }}>
			{children}
		</DashboardContext.Provider>
	);
}

export function useDashboard() {
	const ctx = useContext(DashboardContext);

	if (!ctx) {
		throw new Error("useDashboard must be used within DashboardProvider");
	}

	return ctx;
}
