"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface ActivityPaginationProps {
	currentPage: number;
	totalPages: number;
}

export function ActivityPagination({
	currentPage,
	totalPages,
}: ActivityPaginationProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Create a new URLSearchParams instance and update the URL
	const createQueryString = useCallback(
		(name: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(name, value);

			return params.toString();
		},
		[searchParams],
	);

	// Navigate to a specific page
	const goToPage = (page: number) => {
		if (page < 1 || page > totalPages) return;

		const queryString = createQueryString("page", page.toString());
		router.push(`/dashboard/activities?${queryString}`);
	};

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages = [];

		// Always show first page
		if (currentPage > 3) {
			pages.push(1);
		}

		// Show ellipsis if needed
		if (currentPage > 4) {
			pages.push("ellipsis");
		}

		// Show pages around current page
		for (
			let i = Math.max(2, currentPage - 1);
			i <= Math.min(totalPages - 1, currentPage + 1);
			i++
		) {
			pages.push(i);
		}

		// Show ellipsis if needed
		if (currentPage < totalPages - 3) {
			pages.push("ellipsis");
		}

		// Always show last page
		if (currentPage < totalPages - 2 && totalPages > 1) {
			pages.push(totalPages);
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
						className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
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
								onClick={(e) => {
									e.preventDefault();
									goToPage(page as number);
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
							currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
