# 📖 Guia de Migração e Troubleshooting

## 🎯 Objetivo

Este guia ajuda você a entender as mudanças e como lidar com possíveis cenários após as otimizações dos componentes.

---

## ✅ Checklist de Validação Pós-Deploy

Após fazer o deploy das mudanças, verifique:

### Frontend

- [ ] **SearchBar**: Digite texto e veja atualizar em tempo real
- [ ] **SearchBar**: Clique no X e veja limpar imediatamente
- [ ] **FilterBy**: Clique em múltiplos filtros e veja todos selecionarem
- [ ] **FilterBy**: Clique novamente e veja desselecionar
- [ ] **Dashboard Filter**: Checkboxes respondem imediatamente
- [ ] Todos os componentes mostram loading apenas durante requisição

### URL

- [ ] URL atualiza após interação (não em tempo real)
- [ ] Compartilhar URL carrega com os mesmos filtros
- [ ] Voltar navegação funciona (back button)
- [ ] Parâmetros não desaparecem não intencional

### Performance

- [ ] Menos requisições ao API (monitorar Network tab)
- [ ] Sem delays na UI ao interagir
- [ ] Responsive em mobile e desktop

---

## 🔍 Troubleshooting

### Problema 1: Filtros não aparecem na URL

**Sintoma**: Você clica em um filtro, a UI atualiza, mas a URL não muda

**Causas possíveis**:

1. Debounce ainda está em andamento (aguarde ~750ms)
2. `router.push()` falhou silenciosamente
3. Transição ainda está pendente

**Solução**:

```typescript
// Verificar no console
useEffect(() => {
	console.log("Filtros:", filters);
	console.log("Debounced:", debouncedSelected);
	console.log("isPending:", isPending);
}, [filters, debouncedSelected, isPending]);
```

### Problema 2: Estado desincronizado com URL

**Sintoma**: URL mostra filtros, mas UI não reflete

**Causa**: Sync effect não dispara corretamente

**Solução**:

```typescript
// Adicionar verificação explícita
useEffect(() => {
	const urlValue = query.get(name);
	const stateValue = selected.join(",");

	console.log("URL:", urlValue, "State:", stateValue);

	if (urlValue !== stateValue) {
		setSelected(urlValue?.split(",") || []);
	}
}, [query, name]);
```

### Problema 3: Muitas requisições ao servidor

**Sintoma**: Network tab mostra requisições demais

**Causa**: Debounce muito agressivo (baixo) ou timeout muito alto

**Solução**:

```typescript
// Aumentar debounce se necessário
const debouncedValue = useDebounce(value, 1000); // De 750ms para 1000ms

// Ou adicionar throttle adicional
const [lastRequest, setLastRequest] = useState(Date.now());

useEffect(() => {
	if (Date.now() - lastRequest < 1000) return;
	// ... fazer requisição
	setLastRequest(Date.now());
}, [debouncedValue]);
```

### Problema 4: UI trava ao interagir

**Sintoma**: Clique em checkbox e UI congela

**Causa**: Transição pesada ou render desnecessário

**Solução**:

```typescript
// 1. Verificar se há renders desnecessários
console.log('Render:', new Date().toISOString());

// 2. Usar React DevTools Profiler
// Menu > View > Toggle Developer Tools > Profiler

// 3. Adicionar React.memo se o componente é puro
const FilterItem = React.memo(({ item, selected, onSelect }) => (
  <label>
    <input
      type="checkbox"
      checked={selected}
      onChange={() => onSelect(item.value)}
    />
    {item.label}
  </label>
));
```

### Problema 5: Página inteira re-renderiza

**Sintoma**: Ao atualizar filtro, página toda atualiza

**Causa**: Componente não isolado com `"use client"` ou props desnecessárias

**Solução**:

```typescript
// ✅ CORRETO: Componente isolado
"use client";
export function FilterBy({ ... }) { ... }

// ✅ CORRETO: Não passar objetos desnecessários
<FilterBy
  name="category"
  filterBy={parsedParams.category}
  items={staticItems} // Não mude isso a cada render
/>

// ❌ ERRADO: Criar items a cada render
<FilterBy
  items={[
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ]}
/>
```

---

## 🧪 Testes Manuais

### Teste 1: Interação Básica

```
1. Abra a página
2. Clique em um filtro
3. ✅ Deve atualizar instantaneamente na UI
4. ✅ Indicador de loading aparece
5. ✅ Após ~750ms, URL atualiza
6. ✅ Indicador desaparece
```

### Teste 2: Múltiplas Interações

```
1. Clique em filtro 1 (UI atualiza)
2. Clique em filtro 2 (UI atualiza - sem requisição)
3. Clique em filtro 3 (UI atualiza - sem requisição)
4. ✅ Aguarde ~750ms
5. ✅ UMA requisição é feita com os 3 filtros
```

### Teste 3: Sincronização de URL

```
1. Aplique um filtro
2. ✅ URL atualiza (ex: ?category=lecture,workshop)
3. Compartilhe a URL
4. ✅ Abrir em nova janela carrega com filtros aplicados
5. ✅ Clique back, filtros limpam
```

### Teste 4: Responsividade Mobile

```
1. Abra em mobile ou DevTools (device emulation)
2. ✅ Componentes ocupam 100% da largura
3. ✅ Ícones são clicáveis (min 44x44px)
4. ✅ Texto é legível
5. ✅ Sem horizontal scroll
```

### Teste 5: Tratamento de Erro

```
1. Abra DevTools Network
2. Marque "Throttle" ou "Offline"
3. Tente interagir com filtros
4. ✅ UI atualiza mesmo sem conexão (otimista)
5. ✅ Reconecte, sincronização acontece
6. ✅ UI volta ao estado anterior se erro
```

---

## 📊 Monitoramento

### Métricas para Observar

```javascript
// Adicione isso no seu analytics para monitorar

// 1. Requisições agrupadas
const trackApiCall = (filterCount, debounceTime) => {
	analytics.track("filter_applied", {
		filter_count: filterCount,
		debounce_wait_ms: debounceTime,
		url_synced: true,
	});
};

// 2. Tempo de resposta
const trackResponseTime = (startTime) => {
	const duration = Date.now() - startTime;
	analytics.track("filter_response_time", {
		duration_ms: duration,
		slow: duration > 1000,
	});
};

// 3. Erros de sincronização
try {
	// ... sync
} catch (error) {
	analytics.track("filter_sync_error", {
		error: error.message,
		component: "FilterBy",
	});
}
```

---

## 🔄 Comparação Antes vs Depois

### Código Antigo

```typescript
// ❌ Problemas
useEffect(() => {
  startTransition(() => {
    setCurrentFetchingData(debouncedValue); // ❌ Rastreamento desnecessário
    router.replace(...); // Bloqueia UI
  });
}, [debouncedValue, name]); // ❌ Faltava router no array
```

### Código Novo

```typescript
// ✅ Melhorias
useEffect(() => {
  const urlFilters = filterBy || [];
  if (JSON.stringify(urlFilters) !== JSON.stringify(selected)) {
    setSelected(urlFilters);
  }
}, [filterBy]); // ✅ Sincronização explícita

useEffect(() => {
  startTransition(() => {
    router.replace(...); // ✅ Sem rastreamento de loading
  });
}, [debouncedSelected, name, toUrl, router]); // ✅ Dependências corretas
```

---

## 💡 Dicas de Performance

### 1. Debounce Ideal

```typescript
// Recomendações por tipo de filtro:

// Busca textual: 500-750ms
const debouncedQuery = useDebounce(query, 500);

// Seleção (checkboxes): 750-1000ms
const debouncedFilters = useDebounce(filters, 750);

// Multi-select: 1000-1500ms
const debouncedMulti = useDebounce(selected, 1000);
```

### 2. Otimizar Renderização

```typescript
// ✅ Memorizar items se forem estáticas
const filterItems = useMemo(
  () => [
    { value: "lecture", label: "Palestra" },
    { value: "workshop", label: "Oficina" },
  ],
  []
);

// ✅ Usar useCallback para handlers
const handleSelect = useCallback((value) => {
  setSelected(prev => ...);
}, []);

// ✅ Dividir em componentes menores
<FilterItemCheckbox
  item={item}
  checked={selected.includes(item.value)}
  onChange={() => handleSelect(item.value)}
/>
```

### 3. Reduzir Re-renders

```typescript
// ❌ EVITAR
function ParentComponent() {
  return <FilterBy items={[...]} />; // Items novo a cada render
}

// ✅ FAZER
const FILTER_ITEMS = [
  { value: "lecture", label: "Palestra" },
];

function ParentComponent() {
  return <FilterBy items={FILTER_ITEMS} />; // Mesmo array sempre
}
```

---

## 🚀 Próximas Melhorias

### Curto Prazo

1. [ ] Adicionar persistência de filtros no localStorage
2. [ ] Implementar histórico de pesquisas
3. [ ] Validação em tempo real de filtros

### Médio Prazo

1. [ ] Migrar para `useOptimistic` com rollback
2. [ ] Implementar busca prefetch
3. [ ] Analytics de uso de filtros

### Longo Prazo

1. [ ] Busca avançada com AI
2. [ ] Salvamento de filtros favoritos
3. [ ] Compartilhamento de filtros entre usuários

---

## 📞 Suporte e Dúvidas

Se encontrar problemas:

1. **Consulte o DevTools**

    - Console para erros
    - Network tab para requisições
    - React DevTools Profiler para renders

2. **Verifique o guia de troubleshooting** acima

3. **Examine os examples**

    - Veja `EXEMPLO_USE_OPTIMISTIC.tsx` para casos avançados
    - Compare seu código com os exemplos

4. **Teste em isolation**
    - Teste cada componente separadamente
    - Verifique props e estado
    - Use console.log para debug

---

**Última atualização**: 19 de outubro de 2025  
**Versão**: 1.0.0  
**Status**: ✅ Documentação Completa
