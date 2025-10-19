"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Icons
import { Loader2, UserPlus, Search } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ParticipantItem } from "../participant-item";

// Hooks
import { useParticipantSearch } from "@/hooks/participant/use-participant-search";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useParticipantSelection } from "@/hooks/participant/use-participant-selection";

// Types
import { trpc } from "@/lib/trpc/react";

interface AddMonitorDialogProps {
	projectId: string;
	activityId: string;
	alreadyAdded: string[];
}

export function AddMonitorDialog({
	projectId,
	activityId,
	alreadyAdded,
}: AddMonitorDialogProps) {
	const router = useRouter();
	const currentDate = new Date();

	// Dialog state
	const [isOpen, setIsOpen] = useState(false);

	// Mutation state
	const [addedUsersAmount, setAddedUsersAmount] = useState<
		number | undefined
	>(undefined);
	const [isMutating, startTransition] = useTransition();

	// Custom hooks
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
	const {
		selectedParticipants,
		toggleSelection,
		isSelected,
		clearSelection,
	} = useParticipantSelection();

	// Participants data management
	const [allParticipants, setAllParticipants] = useState<any[]>([]);

	// Update participants list when new data arrives
	useEffect(() => {
		if (data && data.participants) {
			setAllParticipants((prev) => {
				// If first page (new search), replace completely
				if (page === 0) {
					return data.participants;
				}
				// Otherwise, add to existing list (infinite scroll)
				const newParticipants = data.participants.filter(
					(p: any) => !prev.find((existing) => existing.id === p.id),
				);
				return [...prev, ...newParticipants];
			});

			// Check if there are more pages
			if (data.pageCount && page >= data.pageCount - 1) {
				setHasMore(false);
			}

			// Mark search as finished
			setIsSearching(false);
		}
	}, [data, page]);

	// Computed values
	const filteredParticipants = useMemo(
		() =>
			allParticipants.filter(
				(participant) => !alreadyAdded.includes(participant.id),
			),
		[allParticipants, alreadyAdded],
	);

	const unselectedParticipants = useMemo(
		() => filteredParticipants.filter((p) => !isSelected(p.id)),
		[filteredParticipants, isSelected],
	);

	const displayedParticipants = useMemo(
		() => [...selectedParticipants, ...unselectedParticipants],
		[selectedParticipants, unselectedParticipants],
	);

	// Infinite scroll
	const observerTarget = useInfiniteScroll({
		isFetching,
		isSearching,
		hasMore,
		allParticipantsLength: allParticipants.length,
		setPage,
	});

	// Mutations
	const mutations = trpc.addMonitorsToActivity.useMutation();

	// Handlers
	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const selectedParticipantsIds = selectedParticipants.map((p) => p.id);

		console.log("Monitores selecionados: ", selectedParticipantsIds);

		if (selectedParticipantsIds.length === 0) {
			toast.warning(
				"Nenhum monitor selecionado. Selecione ao menos um monitor para adicionar.",
			);
			return;
		}

		try {
			startTransition(async () => {
				await mutations.mutateAsync({
					activityId,
					participantsIdsToAdd: selectedParticipantsIds,
				});
				setAddedUsersAmount(selectedParticipantsIds.length);
				router.refresh();
			});
		} catch (error) {
			console.error(error);
			toast.error("Erro ao adicionar monitor", {
				description:
					"Ocorreu um erro ao adicionar o monitor. Tente novamente mais tarde.",
			});
		}
	}

	// Effects
	useEffect(() => {
		if (isMutating === false && addedUsersAmount) {
			setIsOpen(false);
			setPage(0);
			setSearch("");
			setAllParticipants([]);
			clearSelection();

			const title =
				addedUsersAmount > 1
					? "Monitores adicionados!"
					: "Monitor adicionado!";
			const description =
				addedUsersAmount > 1
					? "Os monitores foram adicionados com sucesso."
					: "O monitor foi adicionado com sucesso.";

			toast.success(title, { description });
		}
	}, [isMutating, addedUsersAmount]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size={"lg"} className="h-10 flex-1">
					<UserPlus size={20} />
					Adicionar monitores
				</Button>
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Adicionar monitores</DialogTitle>
					<DialogDescription>
						{currentDate.toLocaleString("pt-BR", {
							weekday: "long",
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={onSubmit}
					className="flex flex-col items-start justify-start gap-4"
				>
					<div className="flex w-full flex-col items-center justify-start gap-4">
						{/* Search Input */}
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

						{/* Participants List */}
						{displayedParticipants &&
						displayedParticipants.length > 0 ? (
							<div className="flex h-[32.5vh] w-full flex-col items-center justify-start lg:h-[40vh]">
								<ul className="no-scrollbar flex h-full w-full flex-col items-start justify-start gap-4 overflow-y-scroll">
									{displayedParticipants.map(
										(participant: any) => (
											<ParticipantItem
												key={participant.id}
												participant={participant}
												isSelected={isSelected(
													participant.id,
												)}
												onToggle={(checked) =>
													toggleSelection(
														participant,
														checked,
													)
												}
											/>
										),
									)}
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
							<p>Nenhum participante encontrado.</p>
						)}
					</div>

					{/* Footer */}
					<DialogFooter className="w-full gap-2 sm:justify-start">
						<DialogClose asChild>
							<Button
								className="flex flex-1 md:h-10"
								type="button"
								size={"lg"}
								variant="secondary"
								disabled={isMutating}
							>
								Voltar
							</Button>
						</DialogClose>
						<Button
							className="flex flex-1 md:h-10"
							size={"lg"}
							type="submit"
							disabled={isMutating}
						>
							{isMutating ? (
								<Loader2 className="h-6 w-6 animate-spin" />
							) : (
								<>
									Adicionar
									<UserPlus className="h-6 w-6" />
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
