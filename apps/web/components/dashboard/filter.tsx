"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

import { cn } from "@/lib/utils";

// Icons
import { ChevronUp, CircleOff } from "lucide-react";

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
import { useControlledParam } from "@/hooks/use-controlled-param";

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
	// Client-Driven: forneça ambas para gerenciar estado no pai
	value?: string[];
	onChange?: (value: string[]) => void;
}

function RadioFilter() {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-4">
			<p className="text-foreground text-center text-sm font-medium">
				Em desenvolvimento
			</p>
		</div>
	);
}

function FilterBody({
	type,
	...props
}: ItemsProps & { type: NonNullable<FilterProps["type"]> }) {
	switch (type) {
		case "select":
			return <SelectFilter {...props} />;
		case "radio":
			return <RadioFilter />;
		case "checkbox":
		default:
			return <CheckboxFilter {...props} />;
	}
}

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
	value,
	onChange,
}: FilterProps) {
	const {
		value: filters,
		setValue: setFilters,
		isPending: isPendingFilterTransition,
	} = useControlledParam({
		key: prefix,
		value,
		onChange,
		type: "array",
	});

	const safeFilters = (filters ?? []) as string[];

	return (
		<div
			className={cn(
				"flex flex-col items-start justify-center gap-1",
				className,
			)}
		>
			{title && (
				<p className="text-foreground text-center text-sm font-medium text-nowrap">
					{title}
				</p>
			)}
			<FilterBody
				type={type}
				items={items}
				filters={safeFilters}
				setFilters={setFilters}
				config={config}
				isPendingFilterTransition={isPendingFilterTransition}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
}

interface ItemsProps {
	items: FilterProps["items"];
	config?: FilterProps["config"];
	filters: string[];
	setFilters: (value: string[]) => void;
	isPendingFilterTransition?: boolean;
	value?: string[];
	onChange?: (value: string[]) => void;
}

interface SelectItemsProps extends ItemsProps {}

function SelectFilter({
	items,
	config,
	filters,
	setFilters,
	isPendingFilterTransition,
	value,
	onChange,
}: SelectItemsProps) {
	const handleFilterChange = (val: string) => {
		const newFilters = [val];
		if (onChange) {
			onChange(newFilters);
		} else {
			setFilters(newFilters);
		}
	};

	return (
		<Select
			onValueChange={handleFilterChange}
			value={value?.[0] ?? filters[0]}
		>
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
				{items.length > 0 ? (
					items.map((item) => (
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
					))
				) : (
					<SelectItem
						value="none"
						className={cn({
							"pointer-events-none animate-pulse select-none":
								isPendingFilterTransition,
						})}
					>
						Nenhum item encontrado
					</SelectItem>
				)}
				<SelectScrollDownButton />
			</SelectContent>
		</Select>
	);
}

interface CheckboxItemsProps extends ItemsProps {
	isPendingFilterTransition?: boolean;
}

const MAX_VISIBLE_FILTERS = 2;

function CheckboxFilter({
	items,
	filters,
	setFilters,
	isPendingFilterTransition,
	value,
	onChange,
}: CheckboxItemsProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const currentFilters = value ?? filters;

	const handleFilterChange = (val: string, checked: boolean) => {
		const newFilters: string[] = checked
			? [...currentFilters, val]
			: currentFilters.filter((f) => f !== val);

		if (onChange) {
			onChange(newFilters);
		} else {
			setFilters(newFilters);
		}
	};

	return (
		<>
			<ul className="flex w-full flex-col items-start justify-start">
				{items.length > 0 ? (
					items.map((item, index) => {
						// Colapsado: mostra os primeiros itens + os já selecionados,
						// para que um filtro ativo nunca fique escondido.
						const isCollapsible =
							index >= MAX_VISIBLE_FILTERS &&
							!currentFilters.includes(item.value);
						const isCollapsed = !isExpanded && isCollapsible;

						return (
							<li
								key={item.value}
								aria-hidden={isCollapsed}
								inert={isCollapsed}
								className={cn(
									"grid w-full transition-all duration-300 ease-in-out motion-reduce:transition-none",
									isCollapsed
										? "grid-rows-[0fr] opacity-0"
										: "grid-rows-[1fr] opacity-100",
									{
										"pointer-events-none animate-pulse select-none":
											isPendingFilterTransition,
									},
								)}
								style={
									isCollapsible && isExpanded
										? {
												transitionDelay: `${(index - MAX_VISIBLE_FILTERS) * 30}ms`,
											}
										: undefined
								}
							>
								<div className="min-h-0 overflow-hidden">
									<div className="relative flex w-full items-center justify-start gap-2 py-2">
										<Checkbox
											id={item.value}
											name={item.name}
											value={item.value}
											checked={currentFilters.includes(
												item.value,
											)}
											onCheckedChange={(checked) => {
												handleFilterChange(
													item.value,
													checked === "indeterminate"
														? false
														: checked,
												);
											}}
										/>
										<Label
											className="line-clamp-2 overflow-hidden leading-tight text-ellipsis lg:text-sm"
											htmlFor={item.value}
										>
											{item.name}
										</Label>
									</div>
								</div>
							</li>
						);
					})
				) : (
					// If there are no items, we show a message
					<li className="text-muted-foreground flex w-full items-center justify-start gap-3">
						<CircleOff size={14} />
						<Label className="text-sm font-medium">
							Nenhum item encontrado
						</Label>
					</li>
				)}
			</ul>
			{
				// If the amount of filters is greater than the MAX_VISIBLE_FILTERS
				// we show the "ExpandMore" button
				items.length > MAX_VISIBLE_FILTERS && (
					<ExpandMore
						isExpanded={isExpanded}
						setIsExpanded={setIsExpanded}
					/>
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
			className="flex flex-row items-center justify-start gap-4 text-sm leading-none"
			onClick={() => setIsExpanded((prev) => !prev)}
		>
			<ChevronUp
				className="mt-1 h-4 w-4 transition-transform"
				style={{
					transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
				}}
			/>
			Ver {isExpanded ? "menos" : "mais"}
		</button>
	);
}
