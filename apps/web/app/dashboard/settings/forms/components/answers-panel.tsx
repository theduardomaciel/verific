"use client";

import { useState } from "react";

import { keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatAnswerValue } from "@verific/api/schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { downloadCsv, toCsv } from "@/lib/forms/csv";
import { trpc } from "@/lib/trpc/react";

function AnswersSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-hidden>
			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-24" />
			</div>
			{Array.from({ length: 5 }, (_, index) => (
				<div
					key={index}
					className="flex items-center gap-4 border-t pt-3"
				>
					<div className="flex flex-1 flex-col gap-1.5">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-3 w-44" />
					</div>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-24" />
				</div>
			))}
		</div>
	);
}

export function AnswersPanel({
	projectId,
	activityId,
}: {
	projectId: string;
	activityId?: string;
}) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const list = trpc.listAnswers.useQuery(
		{
			projectId,
			activityId,
			page,
			pageSize: 10,
			query: query || undefined,
		},
		{ placeholderData: keepPreviousData },
	);
	const exp = trpc.exportAnswers.useQuery(
		{ projectId, activityId },
		{ enabled: false },
	);

	// `isPending` = primeira carga (sem dados). `isRefreshing` = busca,
	// paginação ou revalidação com a lista anterior ainda visível.
	const isInitialLoading = list.isPending;
	const isRefreshing = list.isFetching && !list.isPending;

	async function handleExport() {
		const result = await exp.refetch();
		if (!result.data) {
			toast.error("Falha ao exportar.");
			return;
		}
		const cols = [
			"Nome",
			"E-mail",
			"Inscrito em",
			...result.data.fields.map((f) => f.label),
		];
		const rows = result.data.rows.map((r) => [
			r.name ?? "",
			r.email ?? "",
			r.joinedAt ? new Date(r.joinedAt).toLocaleString("pt-BR") : "",
			...result.data.fields.map((f) =>
				formatAnswerValue(
					f.type as never,
					(r.answers as Record<string, unknown>)[f.key],
				),
			),
		]);
		downloadCsv(
			`respostas-${projectId.slice(0, 8)}.csv`,
			toCsv(cols, rows),
		);
		toast.success(`${rows.length} respostas exportadas!`);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					Respostas
					{isRefreshing ? (
						<span
							role="status"
							className="text-muted-foreground flex items-center gap-1.5 text-sm font-normal"
						>
							<Loader2
								className="h-4 w-4 animate-spin"
								aria-hidden
							/>
							Carregando...
						</span>
					) : null}
				</CardTitle>
				<Button
					size="sm"
					variant="outline"
					onClick={() => void handleExport()}
					disabled={exp.isFetching}
				>
					{exp.isFetching ? "Exportando..." : "Exportar CSV"}
				</Button>
			</CardHeader>
			<CardContent
				className="flex flex-col gap-4"
				aria-busy={isInitialLoading || isRefreshing}
			>
				<Input
					placeholder="Buscar por nome ou e-mail..."
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setPage(1);
					}}
				/>
				{isInitialLoading ? (
					<AnswersSkeleton />
				) : !list.data || list.data.participants.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhuma inscrição encontrada.
					</p>
				) : (
					<div
						className={
							isRefreshing
								? "pointer-events-none flex flex-col gap-4 opacity-60 transition-opacity"
								: "flex flex-col gap-4 transition-opacity"
						}
					>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-muted-foreground text-left">
										<th className="p-2">Participante</th>
										{list.data.fields.map((f) => (
											<th key={f.id} className="p-2">
												{f.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{list.data.participants.map((p) => (
										<tr key={p.id} className="border-t">
											<td className="p-2">
												<div className="font-semibold">
													{p.user?.name}
												</div>
												<div className="text-muted-foreground text-xs">
													{p.user?.email}
												</div>
											</td>
											{(list.data?.fields ?? []).map(
												(f) => (
													<td
														key={f.id}
														className="max-w-[220px] truncate p-2"
													>
														{formatAnswerValue(
															f.type as never,
															(
																p.answers as Record<
																	string,
																	unknown
																>
															)[f.key],
														)}
													</td>
												),
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="flex items-center justify-between">
							<Button
								size="sm"
								variant="outline"
								disabled={page <= 1 || isRefreshing}
								onClick={() => setPage((v) => v - 1)}
							>
								Anterior
							</Button>
							<span className="text-muted-foreground text-xs">
								Página {page}
							</span>
							<Button
								size="sm"
								variant="outline"
								disabled={
									page >= (list.data.pageCount || 1) ||
									isRefreshing
								}
								onClick={() => setPage((v) => v + 1)}
							>
								Próxima
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
