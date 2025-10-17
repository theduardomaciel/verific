"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Components
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface DashboardPaginationProps {
	currentPage: number;
	totalPages: number;
	prefix: string;
}

export function DashboardPagination({
	currentPage,
	totalPages,
	prefix,
}: DashboardPaginationProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Cria uma nova instância de URLSearchParams e atualiza a URL
	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(name, value);

			return params.toString();
		},
		[searchParams],
	);

	// Navega para uma página específica
	const goToPage = (page: number) => {
		if (page < 1 || page > totalPages) return;

		const queryString = createQueryString("page", page.toString());
		router.push(`/dashboard/${prefix}?${queryString}`);
	};

	// Gera os números de página para exibição
	const getPageNumbers = () => {
		const pages = [];
		const totalPageCount = totalPages;

		// Sempre mostra a primeira página
		pages.push(1);

		// Mostra elipses se necessário
		if (currentPage > 4) {
			pages.push("ellipsis");
		}

		// Mostra páginas ao redor da página atual
		for (
			let i = Math.max(2, currentPage - 1);
			i <= Math.min(totalPageCount - 1, currentPage + 1);
			i++
		) {
			pages.push(i);
		}

		// Mostra elipses se necessário
		if (currentPage < totalPageCount - 3) {
			pages.push("ellipsis");
		}

		// Sempre mostra a última página
		if (currentPage < totalPageCount - 2 && totalPageCount > 1) {
			pages.push(totalPageCount);
		}

		return pages;
	};

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href="#"
						onClick={(e) => {
							e.preventDefault();
							goToPage(currentPage - 1);
						}}
						className={
							currentPage <= 1
								? "pointer-events-none opacity-50"
								: ""
						}
					/>
				</PaginationItem>

				{getPageNumbers().map((page, __) =>
					page === "ellipsis" ? (
						<PaginationItem key={`ellipsis-${page}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={page}>
							<PaginationLink
								href="#"
								isActive={currentPage === page}
								className={
									currentPage === page
										? "pointer-events-none opacity-50"
										: ""
								}
								onClick={(e) => {
									if (currentPage !== page) {
										e.preventDefault();
										goToPage(page as number);
									}
								}}
							>
								{page}
							</PaginationLink>
						</PaginationItem>
					),
				)}

				<PaginationItem>
					<PaginationNext
						href="#"
						onClick={(e) => {
							e.preventDefault();
							goToPage(currentPage + 1);
						}}
						className={
							currentPage >= totalPages
								? "pointer-events-none opacity-50"
								: ""
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
