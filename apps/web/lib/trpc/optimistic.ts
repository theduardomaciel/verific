/**
 * Atualizações otimistas de listas paginadas do tRPC (`getActivities`,
 * `getParticipants`). A linha removida some de todas as páginas/filtros já em
 * cache antes do refetch disparado pelo `invalidate()`, então o organizador
 * que volta para a lista não vê o registro recém-excluído por um instante.
 */

/** Tipo do item guardado na propriedade array `TArray`. */
type ItemOf<TArray> = TArray extends readonly (infer TItem)[] ? TItem : never;

/**
 * Devolve uma cópia de `page` sem os itens de `itemsKey` para os quais
 * `matches` retorna `true`, decrementando `amount`. Quando nada casa, devolve
 * a própria referência, para o react-query não notificar consumidores à toa.
 */
export function removeMatchingItems<
	TPage extends { amount: number },
	TKey extends keyof TPage,
>(
	page: TPage,
	itemsKey: TKey,
	matches: (item: ItemOf<TPage[TKey]>) => boolean,
): TPage {
	const items = page[itemsKey] as readonly ItemOf<TPage[TKey]>[];
	if (!items.some(matches)) {
		return page;
	}

	return {
		...page,
		[itemsKey]: items.filter((item) => !matches(item)),
		amount: Math.max(0, page.amount - 1),
	};
}
