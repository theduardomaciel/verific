"use client";

import { createContext, use } from "react";

import type {
	ProjectMemberRole,
	ProjectPermission,
} from "@verific/drizzle/permissions";

interface DashboardContextValue {
	projectId: string;
	projectUrl: string;
	/** `true` when the signed-in user owns the selected project. */
	isOwner: boolean;
	role: ProjectMemberRole | "owner";
	permissions: ProjectPermission[];
	/** Atalho para esconder ações no cliente; o servidor sempre revalida. */
	can: (permission: ProjectPermission) => boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
	projectId,
	projectUrl,
	isOwner,
	role,
	permissions,
	children,
}: Omit<DashboardContextValue, "can"> & { children: React.ReactNode }) {
	const can = (permission: ProjectPermission) =>
		isOwner || permissions.includes(permission);

	return (
		<DashboardContext
			value={{ projectId, projectUrl, isOwner, role, permissions, can }}
		>
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
