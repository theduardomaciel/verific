"use client";

import { type ReactNode, useState } from "react";
import { ThemeProvider } from "next-themes";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { trpcLinks } from "@/lib/trpc/client";
import { trpc, TRPCProvider } from "@/lib/trpc/react";

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => {
		return new QueryClient();
	});

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
			<TRPCProvider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</TRPCProvider>
		</ThemeProvider>
	);
}
