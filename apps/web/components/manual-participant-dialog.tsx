"use client";

import { useState } from "react";

import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useParticipantSearch } from "@/hooks/participant/use-participant-search";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { trpc } from "@/lib/trpc/react";

import { ParticipantItem } from "./participant-item";

interface Participant {
	id: string;
	shortId: string;
	user: {
		name: string | null;
		email?: string | null;
		image_url?: string | null;
	};
}

interface Props {
	projectId: string;
	buttonLabel?: string;
	buttonVariant?: "default" | "outline";
	title?: string;
	description?: string;
	onSelect: (participant: Participant) => Promise<void>;
}

export function ManualParticipantDialog({
	projectId,
	buttonLabel = "Adicionar manualmente",
	buttonVariant = "outline",
	title = "Adicionar participante",
	description,
	onSelect,
}: Props) {
	const [isOpen, setIsOpen] = useState(false);
	const [isMutating, setIsMutating] = useState(false);

	const {
		page,
		setPage,
		search,
		setSearch,
		hasMore,
		setHasMore,
		isSearching,
		setIsSearching,
		isDebouncing,
		data,
		isFetching,
	} = useParticipantSearch({ projectId, isOpen });

	const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
	const [prevSync, setPrevSync] = useState({ data, page });

	if (
		data?.participants &&
		(prevSync.data !== data || prevSync.page !== page)
	) {
		setPrevSync({ data, page });
		setAllParticipants((prev) => {
			if (page === 0) return data.participants as Participant[];
			const newParticipants = (data.participants as Participant[]).filter(
				(p) => !prev.find((e) => e.id === p.id),
			);
			return [...prev, ...newParticipants];
		});
		if (data.pageCount && page >= data.pageCount - 1) {
			setHasMore(false);
		}
		setIsSearching(false);
	}

	const observerTarget = useInfiniteScroll({
		isFetching,
		isSearching,
		hasMore,
		allParticipantsLength: allParticipants.length,
		setPage,
	});

	async function handleSelect(participant: Participant) {
		if (isMutating) return;
		setIsMutating(true);
		try {
			await onSelect(participant);
			setIsOpen(false);
			setPage(0);
			setSearch("");
			setAllParticipants([]);
		} catch (error) {
			console.error(error);
			toast.error("Erro ao adicionar participante.");
		} finally {
			setIsMutating(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					size="lg"
					variant={buttonVariant}
					className="flex w-full"
				>
					<UserPlus />
					{buttonLabel}
				</Button>
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? (
						<DialogDescription>{description}</DialogDescription>
					) : null}
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="relative w-full">
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
						<Input
							className="w-full pr-10 pl-10"
							placeholder="Pesquisar participantes"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						{(isSearching || isDebouncing) && (
							<Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
						)}
					</div>

					{allParticipants.length > 0 ? (
						<div className="flex h-[32.5vh] w-full flex-col items-center justify-start lg:h-[40vh]">
							<ul className="no-scrollbar flex h-full w-full flex-col items-start justify-start gap-4 overflow-y-scroll">
								{allParticipants.map((participant) => (
									<li key={participant.id} className="w-full">
										<button
											type="button"
											disabled={isMutating}
											onClick={() =>
												void handleSelect(participant)
											}
											className="hover:bg-accent flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left disabled:opacity-50"
										>
											<span className="flex-1 truncate">
												{participant.user?.name ??
													"Sem nome"}
											</span>
											{isMutating ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : null}
										</button>
									</li>
								))}
								<div
									ref={observerTarget}
									className="w-full py-4"
								>
									{isFetching && hasMore && (
										<div className="flex w-full items-center justify-center">
											<Loader2 className="origin-center animate-spin" />
										</div>
									)}
								</div>
							</ul>
						</div>
					) : isSearching ? (
						<div className="flex w-full items-center justify-center py-8">
							<Loader2 className="origin-center animate-spin" />
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							Nenhum participante encontrado.
						</p>
					)}
				</div>
				<div className="flex w-full justify-end pt-2">
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							Fechar
						</Button>
					</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	);
}
