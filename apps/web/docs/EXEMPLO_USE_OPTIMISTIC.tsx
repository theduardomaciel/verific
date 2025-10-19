/**
 * EXEMPLO AVANÇADO: Usando useOptimistic para Rollback Automático
 *
 * Este arquivo demonstra como usar o hook useOptimistic do React 19
 * para implementar otimismo com rollback automático em caso de erro.
 *
 * Use este padrão quando você quiser garantir que a UI reverta
 * se a requisição do servidor falhar.
 */

"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryString } from "@/hooks/use-query-string";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * Versão AVANÇADA com useOptimistic
 * Recomendado para quando você precisa de garantias de sincronização
 */
export function FilterByWithOptimistic({
	name,
	placeholder,
	filterBy,
	items,
	onFilterChange, // Server action que pode falhar
}: {
	name: string;
	placeholder?: string;
	filterBy?: string[];
	items: Array<{ value: string; label: string }>;
	onFilterChange: (filters: string[]) => Promise<void>;
}) {
	const router = useRouter();
	const { toUrl } = useQueryString();
	const [isPending, startTransition] = useTransition();

	// useOptimistic mantém o estado otimista localmente
	// Se a server action falhar, reverte automaticamente
	const [optimisticFilters, addOptimisticFilter] = useOptimistic<
		string[],
		string[]
	>(filterBy || [], (state, newFilters) => newFilters);

	const debouncedFilters = useDebounce(optimisticFilters, 750);

	const handleFilterChange = (value: string) => {
		const newFilters = optimisticFilters.includes(value)
			? optimisticFilters.filter((f) => f !== value)
			: [...optimisticFilters, value];

		// Atualiza UI imediatamente (otimista)
		addOptimisticFilter(newFilters);

		// Envia para servidor em background
		startTransition(async () => {
			try {
				// Atualiza URL
				router.push(
					toUrl({
						[`${name}`]:
							newFilters.length === 0
								? undefined
								: newFilters.join(","),
					}),
					{ scroll: false },
				);

				// Chama server action
				await onFilterChange(newFilters);
			} catch (error) {
				// useOptimistic reverte automaticamente em caso de erro
				console.error("Erro ao atualizar filtros:", error);
				// Opcionalmente, mostrar toast de erro aqui
			}
		});
	};

	return (
		<>
			{/* Renderizar usando optimisticFilters ao invés de filters */}
			{optimisticFilters.map((filter) => (
				<button
					key={filter}
					onClick={() => handleFilterChange(filter)}
					disabled={isPending}
				>
					{filter}
				</button>
			))}
		</>
	);
}

/**
 * PADRÃO: Combining useOptimistic com transição
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │ 1. Usuário clica                                        │
 * │    ↓                                                     │
 * │ 2. UI ATUALIZA IMEDIATAMENTE (useOptimistic)           │
 * │    ↓                                                     │
 * │ 3. Server action é chamada (startTransition)           │
 * │    ↓                                                     │
 * │ 4a. ✅ Sucesso → Estado permanece como está             │
 * │ 4b. ❌ Erro → useOptimistic reverte automaticamente     │
 * └─────────────────────────────────────────────────────────┘
 */

/**
 * EXEMPLO COMPLETO: Dashboard com múltiplos filtros
 */
export function DashboardFiltersOptimistic({
	initialFilters,
	onApplyFilters,
}: {
	initialFilters: Record<string, string[]>;
	onApplyFilters: (filters: Record<string, string[]>) => Promise<void>;
}) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const { toUrl } = useQueryString();

	// Manter estado otimista para todos os filtros
	const [optimisticFilters, updateOptimisticFilters] = useOptimistic<
		Record<string, string[]>,
		Record<string, string[]>
	>(initialFilters, (state, newFilters) => ({
		...state,
		...newFilters,
	}));

	const debouncedFilters = useDebounce(optimisticFilters, 750);

	const handleFilterUpdate = (
		filterName: string,
		value: string,
		checked: boolean,
	) => {
		const currentFilters = optimisticFilters[filterName] || [];
		const newFilters = checked
			? [...currentFilters, value]
			: currentFilters.filter((f) => f !== value);

		const updatedState = {
			...optimisticFilters,
			[filterName]: newFilters,
		};

		// Atualiza UI imediatamente
		updateOptimisticFilters(updatedState);

		// Sincroniza em background
		startTransition(async () => {
			try {
				// Atualiza URL com todos os filtros
				const urlParams = Object.entries(updatedState).reduce(
					(acc, [key, values]) => ({
						...acc,
						[key]: values.length > 0 ? values.join(",") : undefined,
					}),
					{},
				);

				router.push(toUrl(urlParams), { scroll: false });

				// Chama server action
				await onApplyFilters(updatedState);
			} catch (error) {
				console.error("Erro ao aplicar filtros:", error);
				// useOptimistic reverte automaticamente
			}
		});
	};

	return (
		<div className="space-y-4">
			{Object.entries(optimisticFilters).map(([filterName, values]) => (
				<div key={filterName}>
					<h3 className="font-semibold capitalize">{filterName}</h3>
					<div className="space-y-2">
						{/* Renderizar checkboxes usando optimisticFilters */}
						{values.map((value) => (
							<label key={value}>
								<input
									type="checkbox"
									checked={true}
									onChange={(e) =>
										handleFilterUpdate(
											filterName,
											value,
											e.target.checked,
										)
									}
									disabled={isPending}
								/>
								{value}
							</label>
						))}
					</div>
				</div>
			))}
			{isPending && (
				<div className="text-sm text-gray-500">
					Sincronizando filtros...
				</div>
			)}
		</div>
	);
}

/**
 * COMPARAÇÃO: COM vs SEM useOptimistic
 *
 * ╔════════════════════════════════════════════════════════════╗
 * ║ SEM useOptimistic (Implementação Anterior)                ║
 * ╠════════════════════════════════════════════════════════════╣
 * ║ Tempo: ─── [ 750ms wait ] ─── [ request ] ─── [ response ]║
 * ║ UI:    ────[ disabled    ] ─── [ disabled ] ─── [ enabled  ]║
 * ║ Total: ~1500-2000ms de espera                             ║
 * ╚════════════════════════════════════════════════════════════╝
 *
 * ╔════════════════════════════════════════════════════════════╗
 * ║ COM useOptimistic (Nova Implementação)                    ║
 * ╠════════════════════════════════════════════════════════════╣
 * ║ Tempo: [ instant ] [ request happens ] [ response handled ]║
 * ║ UI:    [ enabled ] [ enabled/updating ] [ enabled          ]║
 * ║ Total: ~0ms de espera (UI responsiva IMEDIATAMENTE)       ║
 * ╚════════════════════════════════════════════════════════════╝
 *
 * GANHO: Experiência de usuário infinitamente melhor
 */

/**
 * BOAS PRÁTICAS com useOptimistic:
 *
 * 1. ✅ Use-o para ações que provavelmente terão sucesso
 * 2. ✅ Combine com transição e error handling
 * 3. ✅ Mostre feedback visual se o rollback acontecer
 * 4. ✅ Use debounce para agrupar múltiplas alterações
 * 5. ❌ NÃO use para operações críticas sem validação
 * 6. ❌ NÃO ignore erros do servidor
 * 7. ✅ SEMPRE use { scroll: false } nas navegações
 */

/**
 * QUANDO USAR CADA ABORDAGEM:
 *
 * SEM useOptimistic (Componentes Atuais):
 * - Filtros simples com baixo risco de erro
 * - Quando a URL não precisa estar 100% sincronizada
 * - Performance aceitável com debounce
 *
 * COM useOptimistic (Este exemplo):
 * - Operações críticas que precisam de garantias
 * - Quando você quer rollback automático em erro
 * - Quando precisa de feedback visual de erro
 * - Apps que precisam de UX ultra-responsiva
 */
