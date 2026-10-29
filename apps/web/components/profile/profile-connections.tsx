"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import { trpc } from "@/lib/trpc/react";

export interface ProfileConnectionsData {
	total: number;
	/** Visitantes recentes (até ~7), com nome e avatar. */
	visitors: Array<{ name: string; avatarUrl: string | null }>;
}

function firstName(full: string): string {
	return full.trim().split(/\s+/)[0] ?? full;
}

function initials(full: string): string {
	const parts = full.trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? "";
	const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
	return `${first}${second}`.toUpperCase() || "?";
}

/**
 * Conexões incoming: quem visitou este perfil. `total` vem do servidor
 * (cache de minutos); `visitors` é amostra recente p/ nomes/iniciais. O
 * "e outros" e o "+N" abrem a lista completa.
 */
export function ConnectionsCard({
	profile,
	name,
	connections,
}: {
	profile?: { eventUrl: string; shortId: string };
	name: string;
	connections?: ProfileConnectionsData;
}) {
	const [open, setOpen] = useState(false);
	const total = connections?.total ?? 0;
	const visitors = connections?.visitors ?? [];
	const firstNames = visitors.slice(0, 3).map((v) => firstName(v.name));
	const stack = visitors.slice(0, 6).map((v) => ({
		name: v.name,
		avatarUrl: v.avatarUrl,
		initials: initials(v.name),
	}));
	const remaining = Math.max(total - stack.length, 0);
	const others = total - firstNames.length;
	const canList = profile !== undefined;
	const listButton = {
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": open,
		onClick: () => setOpen((value) => !value),
	} as const;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<Card className="w-full items-start rounded-3xl p-6 md:flex-row md:items-center md:justify-between md:p-9">
					<div className="flex flex-col items-start gap-2">
						<h6 className="text-xl font-semibold">
							Conexões no evento
						</h6>
						{total === 0 ? (
							<p className="text-base font-medium">
								<strong>{name}</strong> ainda não tem conexões —
								hora de colocar o networking em dia!
							</p>
						) : (
							<p className="text-base font-medium">
								<strong>{name}</strong> já se conectou com{" "}
								{firstNames.join(", ")}
								{others > 0 && !canList && (
									<> e outros {others} participantes</>
								)}
								{others > 0 && canList && (
									<>
										{" "}
										<button
											{...listButton}
											className="cursor-pointer underline underline-offset-4"
										>
											e outros {others} participantes
										</button>
									</>
								)}
							</p>
						)}
					</div>
					{total > 0 && (
						<ul className="flex flex-row" aria-label="Conexões">
							{stack.map((s) => (
								<li
									key={`${s.name}-${s.initials}`}
									className="not-first:-ml-2"
									title={s.name}
								>
									<Avatar className="bg-accent h-10 w-10 shadow-2xl md:h-16 md:w-16">
										<AvatarImage
											src={s.avatarUrl ?? undefined}
											alt={s.name}
											referrerPolicy="no-referrer"
										/>
										<AvatarFallback className="bg-background text-foreground text-xs leading-none font-semibold md:text-lg">
											{s.initials}
										</AvatarFallback>
									</Avatar>
								</li>
							))}
							{remaining > 0 && (
								<li className="not-first:-ml-2">
									<button
										disabled={!canList}
										{...listButton}
										aria-label={`Ver todas as ${total} conexões`}
										className="focus-visible:ring-ring cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
									>
										<Avatar className="h-10 w-10 shadow-2xl md:h-16 md:w-16">
											<AvatarFallback className="bg-accent text-accent-foreground text-xs leading-none font-semibold md:text-lg">
												+{remaining}
											</AvatarFallback>
										</Avatar>
									</button>
								</li>
							)}
						</ul>
					)}
				</Card>
			</PopoverAnchor>
			<PopoverContent
				align="end"
				className="w-[min(22rem,calc(100vw-2rem))] p-0"
			>
				{open && profile && <ConnectionsList {...profile} />}
			</PopoverContent>
		</Popover>
	);
}

/** Lista completa, buscada só com a lista aberta. */
function ConnectionsList({
	eventUrl,
	shortId,
}: {
	eventUrl: string;
	shortId: string;
}) {
	const query = trpc.getProfileConnections.useInfiniteQuery(
		{ projectUrl: eventUrl, shortId },
		{ getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
	);
	const people = query.data?.pages.flatMap((page) => page.connections) ?? [];

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-3 p-4" aria-busy="true">
				{Array.from({ length: 4 }, (_, i) => (
					<Skeleton key={i} className="h-9 w-full" />
				))}
			</div>
		);
	}
	if (query.isError) {
		return (
			<div className="flex flex-col items-center gap-3 p-4 text-center text-sm">
				Não foi possível carregar as conexões.
				<Button
					variant="outline"
					size="sm"
					onClick={() => void query.refetch()}
				>
					Tentar de novo
				</Button>
			</div>
		);
	}

	return (
		<div className="flex max-h-80 flex-col overflow-y-auto p-2">
			<ul aria-label="Todas as conexões">
				{people.map((person) => (
					<li key={person.shortId}>
						<Link
							href={`/${eventUrl}/profile/${person.shortId}`}
							className="hover:bg-accent flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium"
						>
							<Avatar className="h-8 w-8" aria-hidden>
								<AvatarImage
									src={person.avatarUrl ?? undefined}
									alt=""
									referrerPolicy="no-referrer"
								/>
								<AvatarFallback className="text-xs">
									{initials(person.name)}
								</AvatarFallback>
							</Avatar>
							{person.name}
						</Link>
					</li>
				))}
			</ul>
			{query.hasNextPage && (
				<Button
					variant="ghost"
					size="sm"
					className="mt-1"
					disabled={query.isFetchingNextPage}
					onClick={() => void query.fetchNextPage()}
				>
					{query.isFetchingNextPage ? "Carregando…" : "Ver mais"}
				</Button>
			)}
		</div>
	);
}
