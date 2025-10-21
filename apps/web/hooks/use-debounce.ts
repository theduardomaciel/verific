"use client";

import { useEffect, useState } from "react";

// Como manter o estado atualizado sem disparar ações desnecessárias?
// A resposta é usar o debounce, que é uma técnica que limita a quantidade de vezes que uma função é chamada
// Isso é útil para ações que são disparadas com frequência, como a busca em tempo real
/* 
    Exemplo de uso:
    const [value, setValue] = useState("");
    const debouncedValue = useDebounce(value, 500);

    useEffect(() => {
        console.log(debouncedValue);
    }, [debouncedValue]);

    return (
        <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
    );

    Neste exemplo, o console.log será chamado somente após 500ms do último evento de digitação.
*/

export function useDebounce<T>(value: T, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
