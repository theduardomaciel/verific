"use client";

import { useState, useTransition, useMemo } from "react";

import { TRPCClientError } from "@trpc/client";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { formatInstant } from "@verific/drizzle/time";

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

import { useEventTimeZone } from "@/components/event-time-zone";

import { refreshRoute } from "@/app/actions";
import { useParticipantSearch } from "@/hooks/participant/use-participant-search";
import { useParticipantSelection } from "@/hooks/participant/use-participant-selection";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { trpc } from "@/lib/trpc/react";

import { ParticipantItem } from "../participant-item";

type SubmitMode = "participants" | "monitors";

interface AddUsersDialogProps {
	projectId: string;
	activityId?: string;
	alreadyAdded?: string[];
	title?: string;
	description?: string;
	/** Elemento que abre o diálogo (botão/ícone). */
	children: React.ReactNode;
	onSubmitSelected?: (participants: any[]) => Promise<void>;
	onAdd?: (participants: any[]) => Promise<void>;
	onSelect?: (participants: any[]) => Promise<void>;
	/** Mostra a opção de inscrever além do limite de vagas. */
	allowOverCapacity?: boolean;
	/** A atividade está lotada: só nesse caso a confirmação de overbooking aparece. */
	isFull?: boolean;
	/** Qual mutation padrão usar quando não há handler customizado. */
	mode?: SubmitMode;
	/** Usa a busca do credenciamento, aberta a monitores da atividade. */
	checkIn?: { activityId?: string };
}

/**
 * Mensagem do servidor quando ela explica a recusa (ex.: não inscrito).
 * Falha de rede não tem `data`, e o erro interno não diz nada útil.
 */
function serverReason(error: unknown) {
	if (!(error instanceof TRPCClientError)) return null;
	const code = (error.data as { code?: string } | undefined)?.code;
	return code && code !== "INTERNAL_SERVER_ERROR" ? error.message : null;
}

export function AddUsersDialog({
	projectId,
	activityId,
	alreadyAdded = [],
	title,
	description,
	children,
	onSubmitSelected,
	onAdd,
	onSelect,
	allowOverCapacity = false,
	isFull = false,
	mode = "participants",
	checkIn,
}: AddUsersDialogProps) {
	const resolvedTitle = title ?? "Adicionar usuários";
	const customHandler = onSubmitSelected ?? onAdd ?? onSelect;

	const timeZone = useEventTimeZone();
	const [currentDate] = useState(() => new Date());

	const [isOpen, setIsOpen] = useState(false);
	const [overbook, setOverbook] = useState(false);
	const [overbookReason, setOverbookReason] = useState("");

	const [isMutating, startTransition] = useTransition();

	const {
		page,
		setPage,
		search,
		setSearch,
		hasMore,
		setHasMore,
		isSearching,
		isDebouncing,
		data,
		isFetching,
		isError,
		refetch,
	} = useParticipantSearch({ projectId, isOpen, checkIn });
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
		mode === "participants"
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
				"Nenhum usuário selecionado. Selecione ao menos um para adicionar.",
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
						...(allowOverCapacity && overbook
							? {
									allowOverCapacity: true,
									overCapacityReason:
										overbookReason.trim() || undefined,
								}
							: {}),
					});
				}
				// O handler customizado (credenciamento) já avisa por pessoa
				if (!customHandler) {
					const many = selectedParticipantsIds.length > 1;
					toast.success(
						many ? "Usuários adicionados!" : "Usuário adicionado!",
						{
							description: many
								? "Os usuários foram adicionados com sucesso."
								: "O usuário foi adicionado com sucesso.",
						},
					);
				}
				setIsOpen(false);
				setPage(0);
				setSearch("");
				setAllParticipants([]);
				clearSelection();
				// Falhar ao atualizar a rota não desfaz o que já foi salvo
				void refreshRoute().catch(console.error);
			} catch (error) {
				console.error(error);
				const message = error instanceof Error ? error.message : "";
				toast.error(
					customHandler
						? "Não foi possível concluir"
						: "Erro ao adicionar",
					{
						description:
							message.includes("limit") && allowOverCapacity
								? "A atividade está lotada. Marque a opção de exceder as vagas para continuar."
								: (serverReason(error) ??
									"Ocorreu um erro. Tente novamente mais tarde."),
					},
				);
			}
		});
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="w-full overflow-hidden sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{resolvedTitle}</DialogTitle>
					<DialogDescription>
						{description ??
							formatInstant(currentDate, timeZone, {
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
								placeholder="Pesquisar usuários"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							{(isSearching || isDebouncing) && (
								<Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
							)}
						</div>

						{allowOverCapacity && isFull ? (
							<div className="flex w-full flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
								<label className="flex cursor-pointer items-start gap-3">
									<input
										type="checkbox"
										id="overbook-checkbox"
										aria-label="Adicionar mesmo sem vagas"
										className="mt-1"
										checked={overbook}
										onChange={(e) =>
											setOverbook(e.target.checked)
										}
									/>
									<span className="flex flex-col gap-0.5">
										<span className="text-sm font-medium">
											Adicionar mesmo sem vagas
										</span>
										<span className="text-muted-foreground text-xs">
											O vínculo fica marcado como
											overbooking e a fila de espera não é
											chamada. Use quando a organização
											decidir acomodar alguém.
										</span>
									</span>
								</label>
								{overbook ? (
									<Input
										placeholder="Motivo (opcional)"
										value={overbookReason}
										onChange={(e) =>
											setOverbookReason(e.target.value)
										}
										maxLength={500}
									/>
								) : null}
							</div>
						) : null}

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
						) : isError ? (
							<div className="flex w-full flex-col items-center justify-center gap-3 py-8 text-center">
								<p>
									Não foi possível carregar os participantes.
								</p>
								<Button
									type="button"
									variant="outline"
									disabled={isFetching}
									onClick={() => void refetch()}
								>
									Tentar de novo
								</Button>
							</div>
						) : isSearching ? (
							<div className="flex w-full items-center justify-center py-8">
								<Loader2 className="origin-center animate-spin" />
							</div>
						) : (
							<p>Nenhum usuário encontrado.</p>
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
							disabled={
								isMutating || selectedParticipants.length === 0
							}
						>
							{isMutating ? (
								<Loader2 className="h-6 w-6 animate-spin" />
							) : (
								<>Adicionar</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export { AddUsersDialog as default };
