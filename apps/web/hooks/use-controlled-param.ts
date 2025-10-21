import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useQueryString } from "./use-query-string";

type ParamType = "string" | "array";

/**
 * Hook para gerenciar parâmetros com dois cenários:
 * 
 * 1. URL-Driven (padrão): Sem onChange. Lê e escreve na URL automaticamente.
 *    - Não aceita `value` prop (usa apenas defaultValue para inicialização)
 *    - Bom para filtros de página, busca, ordenação
 *    - Melhor performance em SSR/navegação
 * 
 * 2. Client-Driven: Com onChange. Gerenciam estado local sem URL.
 *    - Requer `value` e `onChange` props
 *    - Bom para formulários, diálogos, componentes isolados
 *    - Melhor para UX em componentes que não devem persistir estado
 */
export function useControlledParam<T extends string | string[]>({
    key,
    value,
    onChange,
    debounce = 750,
    type = "string",
    defaultValue,
}: {
    key: string;
    value?: T;
    onChange?: (value: T) => void;
    debounce?: number;
    type: ParamType;
    defaultValue?: T;
}) {
    const router = useRouter();
    const { query, toUrl } = useQueryString();

    const [isPending, startTransition] = useTransition();

    // Modo Client-Driven (com onChange): não usa URL
    const isControlled = typeof onChange !== "undefined";

    const parseValue = useCallback(
        (str: string | null): T => {
            if (type === "array") {
                return (str ? str.split(",").filter(Boolean) : []) as T;
            }
            return (str || "") as T;
        },
        [type],
    );

    const serializeValue = useCallback(
        (val: T): string | undefined => {
            if (type === "array") {
                const arr = val as string[];
                return arr.length > 0 ? arr.join(",") : undefined;
            }
            const str = val as string;
            return str || undefined;
        },
        [type],
    );

    // No modo URL-Driven: inicializa do URL, depois usa defaultValue como fallback
    // No modo Client-Driven: usa value prop diretamente
    const getInitialValue = useCallback((): T => {
        if (isControlled) {
            return value as T;
        }
        const urlValue = parseValue(query.get(key));
        const fallback = defaultValue ?? (type === "array" ? ([] as unknown as T) : ("" as unknown as T));
        return urlValue ?? fallback;
    }, [isControlled, value, query, key, parseValue, defaultValue, type]);

    const [localValue, setLocalValue] = useState<T>(getInitialValue);

    // Sincroniza value externo em modo Client-Driven
    useEffect(() => {
        if (isControlled && value !== undefined) {
            setLocalValue(value);
        }
    }, [value, isControlled]);

    // Refs para gerenciar debounce manualmente (mais eficiente que useDebounce)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastUrlUpdateRef = useRef<string | undefined>(undefined);

    // Atualiza URL apenas em modo URL-Driven (sem onChange)
    useEffect(() => {
        if (isControlled) return; // Pula se for Client-Driven

        // Limpa timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce manual - mais eficiente que criar estado extra
        timeoutRef.current = setTimeout(() => {
            const serialized = serializeValue(localValue);

            // Evita navegações desnecessárias se o valor não mudou
            if (lastUrlUpdateRef.current === serialized) {
                return;
            }

            lastUrlUpdateRef.current = serialized;

            startTransition(() => {
                router.push(
                    toUrl({
                        [key]: serialized,
                    }),
                    {
                        scroll: false,
                    },
                );
            });
        }, debounce);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [localValue, key, toUrl, router, isControlled, serializeValue, debounce]);

    const setValue = useCallback(
        (newValue: T) => {
            if (isControlled) {
                onChange(newValue);
            } else {
                setLocalValue(newValue);
            }
        },
        [isControlled, onChange],
    );

    const currentValue = isControlled ? value : localValue;

    return {
        value: currentValue,
        setValue,
        isPending: isControlled ? false : isPending, // Client-Driven nunca está pending
    };
}