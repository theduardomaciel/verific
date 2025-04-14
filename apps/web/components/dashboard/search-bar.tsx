"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

// Icons
import { Search, Loader2, X } from "lucide-react";

// Components
import { Input } from "@/components/ui/input";

// Hooks
import { useQueryString } from "@/hooks/use-query-string";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
	word?: string;
}

export function SearchBar({
	word = "query",
	onChange,
	...props
}: SearchBarProps) {
	const router = useRouter();
	const { query, toUrl } = useQueryString();

	const [isPendingSearchTransition, startTransition] = useTransition();

	const [value, setValue] = useState(query.get(word) || "");
	const debouncedValue = useDebounce(value, 250);

	useEffect(() => {
		startTransition(() => {
			router.push(
				toUrl(
					debouncedValue
						? { [word]: debouncedValue, page: undefined }
						: { [word]: undefined },
				),
				{
					scroll: false,
				},
			);
		});
	}, [debouncedValue, toUrl, router]);

	return (
		<div className="relative w-full">
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				className={cn("pl-10", props.className)}
				value={value}
				onChange={(e) => {
					if (onChange) onChange(e);
					setValue(e.target.value);
				}}
				{...props}
			/>

			<div
				className={
					"absolute right-4 top-1/2 flex -translate-y-1/2 flex-row items-center justify-end gap-2"
				}
			>
				{isPendingSearchTransition ? (
					<Loader2 className="h-4 w-4 origin-center animate-spin text-foreground" />
				) : value ? (
					<X
						className="h-4 w-4 cursor-pointer text-foreground"
						onClick={() => {
							setValue("");
							router.push(toUrl({ [word]: undefined }));
						}}
					/>
				) : null}
			</div>
		</div>
	);
}
