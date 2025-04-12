"use client";

import { useRouter } from "next/navigation";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useState,
	useTransition,
} from "react";

import { cn } from "@/lib/utils";

// Icons
import { ChevronUp } from "lucide-react";

// Components
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectItem,
} from "@/components/ui/select";

// Utils
import { useQueryString } from "@/hooks/use-query-string";
import { useDebounce } from "@/hooks/use-debounce";

interface FilterProps {
	title?: string;
	className?: string;
	type?: "checkbox" | "radio" | "select";
	config?: {
		linesAmount?: number;
		placeholder?: string;
		className?: string;
	};
	prefix: string;
	items: {
		name: string;
		value: string;
	}[];
}

const FILTERS = {
	checkbox: CheckboxFilter,
	select: SelectFilter,
	radio: () => {
		return (
			<div className="flex w-full flex-col items-start justify-center gap-4">
				<p className="text-center text-sm font-medium text-foreground">
					Em desenvolvimento
				</p>
			</div>
		);
	},
};

export function Filter({
	title,
	className,
	type = "checkbox",
	prefix,
	items,
	config = {
		linesAmount: 1,
		placeholder: "Selecione um item",
	},
}: FilterProps) {
	const router = useRouter();
	const { query, toUrl } = useQueryString();

	const [isPendingFilterTransition, startTransition] = useTransition();

	const [filters, setFilters] = useState<string[]>(
		query.get(prefix)?.split(",") ?? [],
	);

	const debouncedValue = useDebounce(filters, 750);

	useEffect(() => {
		startTransition(() => {
			router.push(
				toUrl({
					[`${prefix}`]:
						debouncedValue.length === 0 ? undefined : debouncedValue.join(","),
				}),
				{
					scroll: false,
				},
			);
		});
	}, [debouncedValue, prefix, toUrl, router]);

	return (
		<div
			className={cn(
				"flex flex-col items-start justify-center gap-4",
				className,
			)}
		>
			{title && (
				<p className="text-nowrap text-center text-sm font-medium text-foreground">
					{title}
				</p>
			)}
			{FILTERS[type]({
				items,
				filters,
				setFilters,
				config,
				isPendingFilterTransition,
			})}
		</div>
	);
}

interface ItemsProps {
	items: FilterProps["items"];
	config?: FilterProps["config"];
	filters: string[];
	setFilters: Dispatch<SetStateAction<string[]>>;
	isPendingFilterTransition?: boolean;
}

interface SelectItemsProps extends ItemsProps {}

function SelectFilter({
	items,
	filters,
	setFilters,
	isPendingFilterTransition,
	config,
}: SelectItemsProps) {
	const handleFilterChange = (value: string) => {
		setFilters([value]);
	};

	return (
		<Select onValueChange={handleFilterChange} defaultValue={filters[0]}>
			<SelectTrigger
				disabled={isPendingFilterTransition}
				className={cn(config?.className, {
					"pointer-events-none animate-pulse select-none":
						isPendingFilterTransition,
				})}
			>
				<SelectValue placeholder={config?.placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectScrollUpButton />
				{items.map((item, index) => (
					<SelectItem
						key={item.name}
						value={item.value}
						className={cn({
							"pointer-events-none animate-pulse select-none":
								isPendingFilterTransition,
						})}
					>
						{item.name}
					</SelectItem>
				))}
				<SelectScrollDownButton />
			</SelectContent>
		</Select>
	);
}

interface CheckboxItemsProps extends ItemsProps {
	isPendingFilterTransition: boolean;
}

const MAX_VISIBLE_FILTERS = 2;
const ITEM_HEIGHT = 40;
const GAP = 16;

const heightFormula = (linesAmount: number) => {
	// A função ainda possui um bug: quando o usuário diminui muito o zoom, o texto do filtro passa a ocupar somente uma linha, mas o cálculo da altura não é atualizado
	return (
		(ITEM_HEIGHT + GAP) * MAX_VISIBLE_FILTERS - GAP * (linesAmount - 1 / 2)
	);
};

function CheckboxFilter({
	items,
	filters,
	setFilters,
	isPendingFilterTransition,
	config,
}: CheckboxItemsProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const handleFilterChange = (value: string, checked: boolean) => {
		const newFilters: string[] | undefined = checked
			? [...filters, value]
			: filters.filter((f) => f !== value);

		setFilters(newFilters);
	};

	const linesAmount = config?.linesAmount ?? 1;

	return (
		<>
			<ul
				className={
					"flex max-h-[50rem] flex-col items-start justify-start gap-4 overflow-hidden transition-[max-height] duration-300 ease-in-out"
				}
				style={{
					maxHeight: isExpanded
						? `${ITEM_HEIGHT * items.length * linesAmount}px`
						: `${
								heightFormula(linesAmount)
								// para linesAmount = 1 -> GAP / 2
								// para linesAmount = 2 -> GAP * 2
								// Como tornar isso em uma fórmula?
							}px`,
				}}
			>
				{items.map((item, index) => (
					<li
						key={item.value}
						className={cn("flex w-full items-center justify-start gap-2", {
							"pointer-events-none animate-pulse select-none":
								isPendingFilterTransition,
						})}
					>
						<Checkbox
							id={item.value}
							name={item.name}
							value={item.value}
							checked={filters.includes(item.value)}
							onCheckedChange={(checked) => {
								handleFilterChange(
									item.value,
									checked === "indeterminate" ? false : checked,
								);
							}}
						/>
						<Label
							className="line-clamp-2 overflow-hidden text-ellipsis leading-tight lg:text-sm"
							style={{
								maxHeight: ITEM_HEIGHT - 4,
							}}
							htmlFor={item.value}
						>
							{item.name}
						</Label>
					</li>
				))}
			</ul>
			{
				// If the amount of filters is greater than the MAX_VISIBLE_FILTERS
				// we show the "ExpandMore" button
				items.length > MAX_VISIBLE_FILTERS && (
					<ExpandMore isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
				)
			}
		</>
	);
}

function ExpandMore({
	isExpanded,
	setIsExpanded,
}: {
	isExpanded: boolean;
	setIsExpanded: Dispatch<SetStateAction<boolean>>;
}) {
	return (
		<button
			type="button"
			className="flex flex-row items-center justify-start gap-4 text-sm"
			onClick={() => setIsExpanded((prev) => !prev)}
		>
			<ChevronUp
				className="transition-transform"
				style={{
					transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
				}}
			/>
			Ver {isExpanded ? "menos" : "mais"}
		</button>
	);
}
