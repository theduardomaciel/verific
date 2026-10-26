"use client";

import { useEffect, useState, useTransition, useMemo } from "react";

import { Loader2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";

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

import { refreshRoute } from "@/app/actions";
import { useParticipantSearch } from "@/hooks/participant/use-participant-search";
import { useParticipantSelection } from "@/hooks/participant/use-participant-selection";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { trpc } from "@/lib/trpc/react";

import { ParticipantItem } from "../participant-item";

type DialogRole = "monitor" | "participant";

interface AddParticipantsDialogProps {
	projectId: string;
	activityId?: string;
	alreadyAdded?: string[];
	kind?: DialogRole;
	buttonLabel?: string;
	buttonVariant?: "default" | "outline";
	title?: string;
	description?: string;
	onSubmitSelected?: (participants: any[]) => Promise<void>;
	onAdd?: (participants: any[]) => Promise<void>;
	onSelect?: (participants: any[]) => Promise<void>;
}

export function AddParticipantsDialog({
	projectId,
	activityId,
	alreadyAdded = [],
	kind,
	buttonLabel,
	buttonVariant = "default",
	title,
	description,
	onSubmitSelected,
	onAdd,
	onSelect,
}: AddParticipantsDialogProps) {
	const resolvedRole: DialogRole = kind ?? "monitor";

	const defaultButtonLabel =
		resolvedRole === "participant"
			? "Adicionar participantes"
			: "Adicionar monitores";
	const defaultTitle =
		resolvedRole === "participant"
			? "Adicionar participantes"
			: "Adicionar monitores";

	const resolvedButtonLabel = buttonLabel ?? defaultButtonLabel;
	const resolvedTitle = title ?? defaultTitle;

	const customHandler = onSubmitSelected ?? onAdd ?? onSelect;

	const [currentDate] = useState(() => new Date());

	const [isOpen, setIsOpen] = useState(false);

	const [addedUsersAmount, setAddedUsersAmount] = useState<
		number | undefined
	>(undefined);
	const [isMutating, startTransition] = useTransition();

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

	const [allParticipants, setAllParticipants] = useState<any[]>([]);

	const [prevParticipantsSync, setPrevParticipantsSync] = useState({
		data,
		page,
	});
	if (
		data?.participants &&
		(prevParticipantsSync.data !== data ||
			prevParticipantsSync.page !== page)
	) {
		setPrevParticipantsSync({ data, page });
		setAllParticipants((prev) => {
			if (page === 0) {
				return data.participants;
			}
			const newParticipants = data.participants.filter(
				(p: any) => !prev.find((existing) => existing.id === p.id),
			);
			return [...prev, ...newParticipants];
		});
		if (data.pageCount && page >= data.pageCount - 1) {
			setHasMore(false);
		}
		setIsSearching(false);
	}

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

	const observerTarget = useInfiniteScroll({
		isFetching,
		isSearching,
		hasMore,
		allParticipantsLength: allParticipants.length,
		setPage,
	});

	const utils = trpc.useUtils();
	const mutations: any =
		resolvedRole === "participant"
			? (trpc.addActivityParticipants?.useMutation?.({
					onSuccess: () => {
						void utils?.getActivity?.invalidate?.();
						void utils?.getActivities?.invalidate?.();
					},
				}) ??
				trpc.addMonitorsToActivity.useMutation({
					onSuccess: () => {
						void utils?.getActivity?.invalidate?.();
						void utils?.getActivities?.invalidate?.();
					},
				}))
			: trpc.addMonitorsToActivity.useMutation({
					onSuccess: () => {
						void utils?.getActivity?.invalidate?.();
						void utils?.getActivities?.invalidate?.();
					},
				});

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const selectedParticipantsIds = selectedParticipants.map((p) => p.id);

		if (selectedParticipantsIds.length === 0) {
			toast.warning(
				"Nenhum participante selecionado. Selecione ao menos um para adicionar.",
			);
			return;
		}

		startTransition(async () => {
			try {
				if (customHandler) {
					await customHandler(selectedParticipants);
				} else {
					await mutations.mutateAsync({
						activityId,
						participantsIdsToAdd: selectedParticipantsIds,
					});
				}
				setAddedUsersAmount(selectedParticipantsIds.length);
				await refreshRoute();
			} catch (error) {
				console.error(error);
				const noun =
					resolvedRole === "participant" ? "participante" : "monitor";
				toast.error(`Erro ao adicionar ${noun}`, {
					description: `Ocorreu um erro ao adicionar o ${noun}. Tente novamente mais tarde.`,
				});
			}
		});
	}

	const [prevMutationDone, setPrevMutationDone] = useState({
		isMutating,
		addedUsersAmount,
	});
	if (
		isMutating === false &&
		addedUsersAmount &&
		(prevMutationDone.isMutating !== isMutating ||
			prevMutationDone.addedUsersAmount !== addedUsersAmount)
	) {
		setPrevMutationDone({ isMutating, addedUsersAmount });
		setIsOpen(false);
		setPage(0);
		setSearch("");
		setAllParticipants([]);
		clearSelection();
	}

	useEffect(() => {
		if (isMutating === false && addedUsersAmount) {
			const isMonitor = resolvedRole === "monitor";
			const plural = isMonitor ? "Monitores" : "Participantes";
			const singular = isMonitor ? "Monitor" : "Participante";
			const titleText =
				addedUsersAmount > 1
					? `${plural} adicionados!`
					: `${singular} adicionado!`;
			const descriptionText =
				addedUsersAmount > 1
					? `Os ${isMonitor ? "monitores" : "participantes"} foram adicionados com sucesso.`
					: `O ${isMonitor ? "monitor" : "participante"} foi adicionado com sucesso.`;

			toast.success(titleText, { description: descriptionText });
		}
	}, [isMutating, addedUsersAmount, resolvedRole]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					size={"lg"}
					variant={buttonVariant}
					className="h-10 min-h-10 flex-1 shrink-0"
				>
					<UserPlus size={20} />
					{resolvedButtonLabel}
				</Button>
			</DialogTrigger>
			<DialogContent className="w-full overflow-hidden sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{resolvedTitle}</DialogTitle>
					<DialogDescription>
						{description ??
							currentDate.toLocaleString("pt-BR", {
								weekday: "long",
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => void onSubmit(e)}
					className="flex flex-col items-start justify-start gap-4"
				>
					<div className="flex w-full flex-col items-center justify-start gap-4">
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

					<DialogFooter className="w-full gap-2 sm:justify-start">
						<DialogClose asChild>
							<Button
								className="flex h-10 min-h-10 flex-1 shrink-0"
								type="button"
								size={"lg"}
								variant="secondary"
								disabled={isMutating}
							>
								Voltar
							</Button>
						</DialogClose>
						<Button
							className="flex h-10 min-h-10 flex-1 shrink-0"
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

export { AddParticipantsDialog as default };
