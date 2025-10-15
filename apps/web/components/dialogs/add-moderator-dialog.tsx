"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

// Types
import { trpc } from "@/lib/trpc/react";

interface AddModeratorDialogProps {
	projectId: string;
	activityId: string;
	alreadyAdded: string[];
}

export function AddModeratorDialog({
	projectId,
	activityId,
	alreadyAdded,
}: AddModeratorDialogProps) {
	const router = useRouter();
	const currentDate = new Date();

	const [isOpen, setIsOpen] = useState(false);
	const [page, setPage] = useState(0);
	const [search, setSearch] = useState("");

	const [addedUsersAmount, setAddedUsersAmount] = useState<
		number | undefined
	>(undefined);
	const [isMutating, startTransition] = useTransition();

	const { data, isFetching, refetch } = trpc.getParticipants.useQuery({
		projectId,
		page,
		pageSize: 10,
		query: search,
	});

	const participants =
		data?.participants.filter(
			(participant) => !alreadyAdded.includes(participant.id),
		) || [];

	const pageCount = data?.pageCount || 0;

	const mutations = trpc.addModeratorsToActivity.useMutation();

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const selectedParticipants = Array.from(formData.keys()).filter(
			(key) => formData.get(key) === "on",
		);

		console.log("Moderadores selecionados: ", selectedParticipants);

		if (selectedParticipants.length === 0) {
			toast.warning(
				"Nenhum moderador selecionado. Selecione ao menos um moderador para adicionar.",
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
			toast.error("Erro ao adicionar moderador", {
				description:
					"Ocorreu um erro ao adicionar o moderador. Tente novamente mais tarde.",
			});
		}
	}

	useEffect(() => {
		if (isMutating === false && addedUsersAmount) {
			setIsOpen(false);
			setPage(0);
			setSearch("");

			const title =
				addedUsersAmount > 1
					? "Moderadores adicionados!"
					: "Moderador adicionado!";
			const description =
				addedUsersAmount > 1
					? "Os moderadores foram adicionados com sucesso."
					: "O moderador foi adicionado com sucesso.";

			toast.success(title, {
				description,
			});
		}
	}, [isMutating, addedUsersAmount, toast]);

	useEffect(() => {
		if (isOpen) {
			refetch();
		}
	}, [isOpen, search, page, refetch]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size={"lg"} className="h-10 flex-1">
					<UserPlus size={20} />
					Adicionar moderadores
				</Button>
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Adicionar moderadores</DialogTitle>
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
								className="w-full pl-10"
								placeholder="Pesquisar moderadores"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						{participants && participants.length > 0 ? (
							<div className="no-scrollbar max-h-[32.5vh] w-full overflow-y-scroll lg:max-h-[40vh]">
								<ul className="flex h-full w-full flex-col items-start justify-start gap-4">
									{participants.map((participant) => (
										<li
											key={participant.id}
											className="flex w-full flex-row items-center justify-between"
										>
											<div className="flex flex-row items-center justify-start gap-4">
												<Image
													src={
														participant.user
															?.image_url ??
														"https://github.com/marquinhos.png"
													}
													width={36}
													height={36}
													className="rounded-full"
													alt="Profile picture"
												/>
												<span className="text-neutral text-left text-base leading-tight font-semibold">
													{participant.user?.name ??
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
									))}
								</ul>
								{pageCount > 1 && (
									<div className="mt-4 flex justify-center">
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setPage((prev) =>
													Math.max(0, prev - 1),
												)
											}
											disabled={page === 0}
										>
											Anterior
										</Button>
										<span className="mx-4">
											Página {page + 1} de {pageCount}
										</span>
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setPage((prev) =>
													Math.min(
														pageCount - 1,
														prev + 1,
													),
												)
											}
											disabled={page >= pageCount - 1}
										>
											Próxima
										</Button>
									</div>
								)}
							</div>
						) : isFetching ? (
							<Loader2 className="origin-center animate-spin" />
						) : (
							<p>Nenhum moderador encontrado.</p>
						)}
					</div>
					<DialogFooter className="w-full gap-2 sm:justify-start">
						<DialogClose asChild>
							<Button
								className="w-full md:h-12"
								type="button"
								size={"lg"}
								variant="secondary"
								disabled={isMutating}
							>
								Voltar
							</Button>
						</DialogClose>
						<Button
							className="w-full md:h-12"
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
