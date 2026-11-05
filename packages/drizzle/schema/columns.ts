import { timestamp } from "drizzle-orm/pg-core";

/**
 * Instante: `timestamptz` com milissegundos, a precisão do `Date` do JS.
 * Com mais casas, um cursor de paginação que volta do cliente como `Date`
 * deixaria de bater com o valor salvo.
 */
export const instant = (name: string) =>
	timestamp(name, { withTimezone: true, precision: 3 });
