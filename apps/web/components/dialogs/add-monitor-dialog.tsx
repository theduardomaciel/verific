"use client";

import Image from "next/image";
import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Icons
import { Loader2, UserPlus, Search, User } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

// Types
import { trpc } from "@/lib/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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

	const [isOpen, setIsOpen] = useState(false);
	const [page, setPage] = useState(0);
	const [search, setSearch] = useState("");
	const [allParticipants, setAllParticipants] = useState<
		typeof undefined extends undefined ? any[] : unknown[]
	>([]);
	const [hasMore, setHasMore] = useState(true);
	const [isSearching, setIsSearching] = useState(false);
	const observerTarget = useRef<HTMLDivElement>(null);

	const [addedUsersAmount, setAddedUsersAmount] = useState<
		number | undefined
	>(undefined);
	const [isMutating, startTransition] = useTransition();

	const { data, isFetching, refetch } = trpc.getParticipants.useQuery({
		projectId,
		page,
		pageSize: 10,
		query: search,
		sort: "name_asc",
	});

	// Atualizar lista quando novos dados chegam
	useEffect(() => {
		if (data?.participants) {
			console.log("Novos participantes recebidos: ", data.participants);

			setAllParticipants((prev) => {
				// Se é a primeira página (nova busca), substituir completamente
				if (page === 0) {
					return data.participants;
				}
				// Caso contrário, adicionar à lista existente (infinite scroll)
				const newParticipants = data.participants.filter(
					(p) => !prev.find((existing) => existing.id === p.id),
				);
				return [...prev, ...newParticipants];
			});

			// Verificar se há mais páginas
			if (data.pageCount && page >= data.pageCount - 1) {
				setHasMore(false);
			}

			// Marcar que a busca terminou
			setIsSearching(false);
		}
	}, [data?.participants, page]);

	// Resetar quando search muda
	useEffect(() => {
		if (isOpen) {
			setPage(0);
			setHasMore(true);
			setIsSearching(true);
			refetch();
		}
	}, [search, isOpen, refetch]);

	const filteredParticipants = allParticipants.filter(
		(participant) => !alreadyAdded.includes(participant.id),
	);

	const mutations = trpc.addMonitorsToActivity.useMutation();

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const selectedParticipants = Array.from(formData.keys()).filter(
			(key) => formData.get(key) === "on",
		);

		console.log("Monitores selecionados: ", selectedParticipants);

		if (selectedParticipants.length === 0) {
			toast.warning(
				"Nenhum monitor selecionado. Selecione ao menos um monitor para adicionar.",
			);
			return;
		}

		try {
			startTransition(async () => {
				await mutations.mutateAsync({
					activityId,
					participantsIdsToAdd: selectedParticipants,
				});
				setAddedUsersAmount(selectedParticipants.length);
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

	// Infinite scroll observer
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (
					entry &&
					entry.isIntersecting &&
					!isFetching &&
					!isSearching &&
					hasMore &&
					allParticipants.length > 0
				) {
					setPage((prev) => prev + 1);
				}
			},
			{ threshold: 0.1 },
		);

		if (observerTarget.current) {
			observer.observe(observerTarget.current);
		}

		return () => observer.disconnect();
	}, [isFetching, isSearching, hasMore, allParticipants.length]);

	useEffect(() => {
		if (isMutating === false && addedUsersAmount) {
			setIsOpen(false);
			setPage(0);
			setSearch("");
			setAllParticipants([]);

			const title =
				addedUsersAmount > 1
					? "Monitores adicionados!"
					: "Monitor adicionado!";
			const description =
				addedUsersAmount > 1
					? "Os monitores foram adicionados com sucesso."
					: "O monitor foi adicionado com sucesso.";

			toast.success(title, {
				description,
			});
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
						<div className="relative w-full">
							<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
							<Input
								className="w-full pr-10 pl-10"
								placeholder="Pesquisar participantes"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							{isSearching && (
								<Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
							)}
						</div>
						{filteredParticipants &&
						filteredParticipants.length > 0 ? (
							<div className="flex h-[32.5vh] w-full flex-col items-center justify-start lg:h-[40vh]">
								<ul className="no-scrollbar flex h-full w-full flex-col items-start justify-start gap-4 overflow-y-scroll">
									{filteredParticipants.map(
										(participant: any) => (
											<li
												key={participant.id}
												className="flex w-full flex-row items-center justify-between"
											>
												<div className="flex flex-row items-center justify-start gap-4">
													<Avatar className="h-9 w-9">
														<AvatarImage
															src={
																participant.user
																	?.image_url ||
																undefined
															}
														/>
														<AvatarFallback>
															<User className="h-5 w-5" />
														</AvatarFallback>
													</Avatar>
													<span className="text-neutral text-left text-base leading-tight font-semibold">
														{participant.user
															?.name ??
															`@${participant.id}`}
													</span>
												</div>
												<div className="flex flex-row items-center justify-end gap-4">
													{participant.user?.name && (
														<span className="text-neutral hidden text-xs leading-none font-semibold opacity-50 md:flex">
															@
															{
																participant.user?.email?.split(
																	"@",
																)[0]
															}
														</span>
													)}
													<Checkbox
														id={participant.id}
														name={participant.id}
														className="h-6 w-6"
													/>
												</div>
											</li>
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
								className="flex flex-1 md:h-12"
								type="button"
								size={"lg"}
								variant="secondary"
								disabled={isMutating}
							>
								Voltar
							</Button>
						</DialogClose>
						<Button
							className="flex flex-1 md:h-12"
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
