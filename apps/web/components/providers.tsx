"use client";

import { type ReactNode, useState } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";

import { trpcLinks } from "@/lib/trpc/client";
import { createQueryClient } from "@/lib/trpc/query-client";
import { trpc } from "@/lib/trpc/react";

import { Toaster } from "./ui/sonner";

import type { QueryClient } from "@tanstack/react-query";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
	if (typeof window === "undefined") {
		// Server: always make a new query client
		return createQueryClient();
	} else {
		// Browser: use singleton pattern to keep the same query client
		return (clientQueryClientSingleton ??= createQueryClient());
	}
};

export function Providers({ children }: { children: ReactNode }) {
	// useState preserves the same client across renders (no cache loss).
	const [queryClient] = useState(getQueryClient);

	const [trpcClient] = useState(() => {
		return trpc.createClient({
			links: trpcLinks,
		});
	});

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>
					<NextTopLoader
						showSpinner={false}
						color="var(--ev-loader, var(--primary))"
					/>
					{children}
					<Toaster richColors closeButton />
				</QueryClientProvider>
			</trpc.Provider>
		</ThemeProvider>
	);
}
