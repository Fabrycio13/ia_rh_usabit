# Plano de Migração: Drag-and-Drop para @atlaskit/pragmatic-drag-and-drop

**Data:** 05/05/2026
**Arquivo:** `src/pages/candidates/Pipeline.tsx`
**Biblioteca:** @atlaskit/pragmatic-drag-and-drop
**Status:** Verificado e Atualizado

---

## 1. Introdução

### 1.1 Objetivo
Migrar o sistema de drag-and-drop do Pipeline de HTML5 Drag-and-Drop nativo para a biblioteca `@atlaskit/pragmatic-drag-and-drop` para melhorar performance, acessibilidade e suporte a touch.

### 1.2 Contexto
O arquivo `Pipeline.tsx` implementa um Kanban board para gerenciamento de candidatos no processo seletivo. O drag-and-drop atual permite:
- Mover cards (candidatos) entre colunas
- Reordenar cards dentro da mesma coluna
- Reordenar colunas entre si

**IMPORTANTE:** O drag-and-drop atual é **APENAS** para mover cards **DENTRO** do pipeline. Não existe drag de fora para dentro do pipeline.

### 1.3 Regras de Negócio a Preservar

#### Como Candidatos Entram no Pipeline (NÃO é drag-and-drop):
1. **Via Modal** (`AddCandidateModal`): O usuário clica em "+" e seleciona candidatos de uma lista
2. **Via Transfer** (`TalentTransferModal`): Do painel do candidato, transfere para o banco de talentos
3. **Flag `interview_eligible`**: Controla quais candidatos aparecem na lista de elegíveis

#### Funções Críticas a NÃO Modificar:
- `addCard()` - Adiciona candidato ao pipeline
- `removeCard()` - Remove candidato do pipeline
- `moveCard()` - Move card entre colunas (usado pelo menu "Mover para...")
- `reorderCard()` - Reordena card dentro da coluna (usado pelo menu "Reordenar")

---

## 2. Sistema Atual de Drag-and-Drop

### 2.1 Estado Atual (Linhas ~315-319)
```tsx
const [draggingCard, setDraggingCard] = useState<PipelineCard | null>(null);
const [draggingCol, setDraggingCol] = useState<PipelineColumn | null>(null);
const [dragOverCol, setDragOverCol] = useState<string | null>(null);
const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
```

### 2.2 Funções de Drag a Substituir

| Função | Linha Aproximada | Descrição |
|--------|------------------|-----------|
| `onDragStart` | ~879 | Inicia drag, armazena dados em dataTransfer |
| `onDragEnd` | ~901 | Limpa estado de drag |
| `onDragOverCol` | ~908 | Detecta hover sobre coluna |
| `onDragOverCard` | ~914 | Detecta hover sobre card |
| `onDrop` | ~921 | Processa drop (move card entre colunas e reordena colunas) |

### 2.3 CSS Involved (Linhas ~77-86)
```css
.pipe-card.dragging { opacity: 0.1; }
.pipe-card.custom-ghost { position: fixed; pointer-events:none; z-index:9999; width:250px; left:0; top:0; opacity:1 !important; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform: rotate(3deg); border: 2px solid var(--primary); }
.pipe-card.drop-target { border-top: 2px solid var(--primary); margin-top: -2px; }
.pipe-col.drag-over { border-color: var(--primary); background: rgba(99,102,241,0.04); }
.pipe-col.dragging { opacity: 0.1; }
```

### 2.4 Ghost Element (Linhas ~1651-1673)
O sistema atual usa um elemento "ghost" customizado que segue o cursor durante o drag.

### 2.5 ColHeader (Linhas ~184-230)
O header das colunas também é arrastável para reordenar colunas:
```tsx
<div
    style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}
    draggable
    onDragStart={e => onDragStart(e, 'col', col)}
    onDragEnd={onDragEnd}
>
```

### 2.6 Componentes de Menu dos Cards

O card tem dois menus:
1. **"Reordenar"** (linhas ~1287-1298) - chama `reorderCard(card, direction)`
2. **"Mover para..."** (linhas ~1314-1320) - chama `moveCard(card, colId)`

**ATENÇÃO:** `MoveCardDropdown` (linhas ~1700-1748) é **CÓDIGO MORTO** - nunca é usado no render.

---

## 3. Nova Implementação com @atlaskit

### 3.1 Instalação
```bash
npm install @atlaskit/pragmatic-drag-and-drop
```

### 3.2 Novos Imports
```tsx
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerInside } from '@atlaskit/pragmatic-drag-and-drop-hitbox/pointer-inside';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
```

### 3.3 Estado Simplificado

**ANTES (5 estados):**
```tsx
const [draggingCard, setDraggingCard] = useState<PipelineCard | null>(null);
const [draggingCol, setDraggingCol] = useState<PipelineColumn | null>(null);
const [dragOverCol, setDragOverCol] = useState<string | null>(null);
const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
```

**DEPOIS (3 estados):**
```tsx
const [activeCardId, setActiveCardId] = useState<string | null>(null);
const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
```

### 3.4 Refs para Elementos (Adicionar)
```tsx
const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
const columnRefs = useRef<Map<string, HTMLElement>>(new Map());
const colHeaderRefs = useRef<Map<string, HTMLElement>>(new Map());
```

### 3.5 useEffect para Draggable Cards (NOVO)

```tsx
useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];

    cards.forEach(card => {
        const element = cardRefs.current.get(card.id);
        if (!element) return;

        const cleanup = draggable({
            element,
            getInitialData: () => ({
                type: 'card',
                cardId: card.id,
                columnId: card.column_id
            }),
            onDragStart: ({ source }) => {
                setActiveCardId(source.data.cardId as string);
            },
            onDragEnter: ({ location }) => {
                const dest = location.current.dropTargets[0];
                if (dest?.data.columnId) {
                    setDragOverColumnId(dest.data.columnId as string);
                }
            },
            onDragLeave: () => {
                // Não limpar para manter feedback visual
            },
            onDrop: ({ location, source }) => {
                setActiveCardId(null);
                setDragOverColumnId(null);

                const destination = location.current.dropTargets[0];
                if (!destination) return;

                const targetColumnId = destination.data.columnId as string;
                const cardId = source.data.cardId as string;

                // Calcular posição baseado no card sobre o qual fez drop
                const dropTargets = location.current.dropTargets;
                let targetIndex = 0;

                if (dropTargets.length > 1) {
                    const overCardId = dropTargets[1].data.cardId as string;
                    const columnCards = cards
                        .filter(c => c.column_id === targetColumnId)
                        .sort((a, b) => a.position - b.position);
                    const overIndex = columnCards.findIndex(c => c.id === overCardId);
                    targetIndex = overIndex >= 0 ? overIndex : columnCards.length;
                }

                // Chamar função de reorder existente
                reorderCardInColumn(cardId, targetColumnId, targetIndex);

                // Logging
                const card = cards.find(c => c.id === cardId);
                const sourceCol = columns.find(cl => cl.id === card?.column_id);
                const targetCol = columns.find(cl => cl.id === targetColumnId);

                if (card && sourceCol?.id !== targetColumnId && profile.userId) {
                    const pipe = pipelines.find(p => p.id === (card.pipeline_id || selectedPipelineId));
                    logScreening(
                        profile.userId,
                        card.candidate_id,
                        'move',
                        sourceCol?.name,
                        targetCol?.name,
                        { card_id: card.id, job_id: card.job_id, job_name: card.display_job_name }
                    );
                    logActivity(profile.userId, `Moveu "${card.candidate_name}" para "${targetCol?.name || 'Etapa'}" no processo "${pipe?.name || 'Pipeline'}"`);
                }
            }
        });

        cleanupFunctions.push(cleanup);
    });

    return () => cleanupFunctions.forEach(fn => fn());
}, [cards, columns, profile, pipelines, selectedPipelineId]);
```

### 3.6 useEffect para Drop Targets - Colunas (NOVO)

```tsx
useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];

    columns.forEach(column => {
        const element = columnRefs.current.get(column.id);
        if (!element) return;

        const cleanup = dropTargetForElements({
            element,
            canDrop: ({ source }) => source.data.type === 'card' || source.data.type === 'col',
            getData: () => ({ columnId: column.id })
        });

        cleanupFunctions.push(cleanup);
    });

    return () => cleanupFunctions.forEach(fn => fn());
}, [columns]);
```

### 3.7 useEffect para Draggable Colunas (NOVO - ColHeader)

```tsx
useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];

    columns.forEach(col => {
        const headerEl = colHeaderRefs.current.get(col.id);
        if (!headerEl) return;

        const cleanup = draggable({
            element: headerEl,
            getInitialData: () => ({
                type: 'col',
                columnId: col.id
            }),
            onDragStart: ({ source }) => {
                setActiveColumnId(source.data.columnId as string);
            },
            onDrop: ({ location, source }) => {
                setActiveColumnId(null);

                const destination = location.current.dropTargets[0];
                if (!destination) return;

                const targetColumnId = destination.data.columnId as string;
                const sourceColumnId = source.data.columnId as string;

                if (sourceColumnId === targetColumnId) return;

                // Reordenar colunas
                const sourceIdx = columns.findIndex(c => c.id === sourceColumnId);
                const targetIdx = columns.findIndex(c => c.id === targetColumnId);

                if (sourceIdx === -1 || targetIdx === -1) return;

                const newCols = [...columns];
                const [moved] = newCols.splice(sourceIdx, 1);
                newCols.splice(targetIdx, 0, moved);

                const updatedCols = newCols.map((c, i) => ({ ...c, position: i }));
                setColumns(updatedCols);

                // Persistir no Supabase
                for (const c of updatedCols) {
                    await supabase.from('pipeline_columns').update({ position: c.position }).eq('id', c.id);
                }
            }
        });

        cleanupFunctions.push(cleanup);
    });

    return () => cleanupFunctions.forEach(fn => fn());
}, [columns]);
```

### 3.8 Renderização Atualizada dos Cards

**ANTES:**
```tsx
<div
    key={card.id}
    className={`pipe-card${draggingCard?.id === card.id ? ' dragging' : ''}${dragOverCardId === card.id ? ' drop-target' : ''}`}
    draggable
    onDragStart={e => onDragStart(e, 'card', card)}
    onDragEnd={onDragEnd}
    onDragOver={e => onDragOverCard(e, card.id)}
    onClick={() => openCandidate(card)}
>
```

**DEPOIS:**
```tsx
<div
    key={card.id}
    ref={el => { if (el) cardRefs.current.set(card.id, el); }}
    className={`pipe-card${activeCardId === card.id ? ' dragging' : ''}`}
    onClick={() => { if (!activeCardId && !cardMenuOpen) openCandidate(card); }}
>
```

### 3.9 Renderização Atualizada das Colunas

**ANTES:**
```tsx
<div
    key={col.id}
    className={`pipe-col${dragOverCol === col.id ? ' drag-over' : ''}${draggingCol?.id === col.id ? ' dragging' : ''}`}
    onDragEnd={onDragEnd}
    onDragOver={e => onDragOverCol(e, col.id)}
    onDrop={e => onDrop(e, col.id)}
>
```

**DEPOIS:**
```tsx
<div
    key={col.id}
    ref={el => { if (el) columnRefs.current.set(col.id, el); }}
    className={`pipe-col${dragOverColumnId === col.id ? ' drag-over' : ''}`}
>
```

### 3.10 Renderização Atualizada do ColHeader

**ANTES:**
```tsx
<div
    style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}
    draggable
    onDragStart={e => onDragStart(e, 'col', col)}
    onDragEnd={onDragEnd}
>
```

**DEPOIS:**
```tsx
<div
    ref={el => { if (el) colHeaderRefs.current.set(col.id, el); }}
    style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}
>
```

---

## 4. Funções a Remover

### 4.1 Estado
- [ ] `draggingCard`
- [ ] `draggingCol`
- [ ] `dragOverCol`
- [ ] `dragOverCardId`
- [ ] `dragPos`

### 4.2 Funções
- [ ] `onDragStart`
- [ ] `onDragEnd`
- [ ] `onDragOverCol`
- [ ] `onDragOverCard`
- [ ] `onDrop`

### 4.3 CSS (Remover/Reformular)
- [ ] `.pipe-card.dragging` (substituir por versão simplificada: `opacity: 0.4; transform: scale(1.02);`)
- [ ] `.pipe-card.custom-ghost` (REMOVER - @atlaskit cuida do ghost)
- [ ] `.pipe-card.drop-target` (REMOVER - feedback diferente)
- [ ] `.pipe-col.dragging` (REMOVER)

### 4.4 Ghost Element
- [ ] Remover renderização do ghost element (linhas ~1651-1673)

### 4.5 Código Morto
- [ ] Remover `MoveCardDropdown` component (linhas ~1700-1748) - nunca é usado

---

## 5. Nova Função de Reordenação

```tsx
async function reorderCardInColumn(
    cardId: string,
    targetColumnId: string,
    targetIndex: number
) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const sourceColumnId = card.column_id;

    // Se mesma coluna - reordenar
    if (sourceColumnId === targetColumnId) {
        const columnCards = cards
            .filter(c => c.column_id === sourceColumnId && c.id !== cardId)
            .sort((a, b) => a.position - b.position);

        columnCards.splice(targetIndex, 0, card);
        const updates = columnCards.map((c, idx) => ({
            id: c.id,
            position: idx
        }));

        // Batch update no Supabase
        for (const update of updates) {
            await supabase
                .from('pipeline_cards')
                .update({ position: update.position })
                .eq('id', update.id);
        }

        // Atualizar estado local
        setCards(prev => prev.map(c => {
            if (c.id === cardId) return { ...c, position: targetIndex };
            const idx = updates.findIndex(u => u.id === c.id);
            if (idx >= 0) return { ...c, position: updates[idx].position };
            return c;
        }));
    } else {
        //跨列移动 - usar moveCard existente
        moveCard(card, targetColumnId);
    }
}
```

---

## 6. CSS Atualizado

```css
/* Card em drag - opacity menor com leve scale */
.pipe-card.dragging {
    opacity: 0.4;
    transform: scale(1.02);
}

/* Coluna com card sobre ela */
.pipe-col.drag-over {
    border-color: var(--primary);
    background: rgba(99,102,241,0.08);
}

/* Coluna sendo arrastada */
.pipe-col.dragging {
    opacity: 0.5;
}

/* Cursor de grab durante drag */
[data-dnd-dragging] {
    cursor: grabbing !important;
}
```

---

## 7. Checklist de Migração

### Fase 1: Preparação
- [ ] Instalar `@atlaskit/pragmatic-drag-and-drop`
- [ ] Adicionar imports
- [ ] Criar refs (`cardRefs`, `columnRefs`, `colHeaderRefs`)
- [ ] Criar estados (`activeCardId`, `activeColumnId`, `dragOverColumnId`)

### Fase 2: Card Draggable + Drop Target
- [ ] useEffect para cards draggable
- [ ] useEffect para colunas como drop targets de cards
- [ ] Refs nos cards
- [ ] Refs nas colunas
- [ ] Handler `onDragStart` do @atlaskit
- [ ] Handler `onDrop` do @atlaskit para cards
- [ ] Testar drag de cards

### Fase 3: Coluna Draggable + Drop Target
- [ ] ColHeader com ref
- [ ] useEffect para colunas draggable
- [ ] Colunas como drop targets de colunas
- [ ] Handler `onDrop` para reorder de colunas
- [ ] Testar drag de colunas

### Fase 4: Estado e Visual
- [ ] Ghost element - **REMOVER** (linhas ~1651-1673)
- [ ] `MoveCardDropdown` component - **REMOVER** (código morto)
- [ ] CSS `.pipe-card.dragging` - simplificar
- [ ] CSS `.pipe-card.drop-target` - **REMOVER**
- [ ] CSS `.pipe-card.custom-ghost` - **REMOVER**
- [ ] CSS `.pipe-col.dragging` - **REMOVER**

### Fase 5: Click During Drag
- [ ] Modificar click do card para checar `activeCardId` antes de abrir

### Fase 6: Logging
- [ ] Mover logging do `onDrop` para `onDrop` do @atlaskit

### Fase 7: Limpeza
- [ ] Remover estado antigo (`draggingCard`, `draggingCol`, `dragOverCol`, `dragOverCardId`, `dragPos`)
- [ ] Remover funções antigas (`onDragStart`, `onDragEnd`, `onDragOverCol`, `onDragOverCard`, `onDrop`)

### Fase 8: Testes
- [ ] Mover card para mesma coluna
- [ ] Mover card para outra coluna
- [ ] Reordenar colunas via drag
- [ ] Verificar ordem de display após reorder
- [ ] Verificar logging de eventos (logScreening, logActivity)
- [ ] Testar click no card (não abre durante drag)
- [ ] Testar menu dropdown durante drag

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Perda de feedback visual durante drag | Usar CSS transitions e opacity |
| Problemas com reordenação | Manter `moveCard` e `reorderCard` como fallback |
| Ghost element não aparece | @atlaskit tem ghost próprio |
| Performance com muitos cards | @atlaskit é otimizado |
| Menu dropdown conflitar com drag | Verificar `activeCardId` antes de abrir card |
| Colunas não reordenam | Testar com useEffect separado para colHeaderRefs |

---

## 9. Referências

- [Documentação @atlaskit/pragmatic-drag-and-drop](https://atlassian.design/components/pragmatic-drag-and-drop)
- [Exemplos de código](https://atlaskit.atlassian.com/packages/@atlaskit/pragmatic-drag-and-drop/docs)
- [Hitbox pointer-inside](https://atlaskit.atlassian.com/packages/@atlaskit/pragmatic-drag-and-drop-hitbox)

---

## 10. Alternativas Consideradas

### 10.1 Manter HTML5 DnD
**Motivos para descarte:** Performance ruim em listas grandes, acessibilidade limitada, suporte a touch inexistente.

### 10.2 Usar react-beautiful-dnd
**Motivos para descarte:** Deprecated pela Atlassian, não suporta touch.

### 10.3 Usar dnd-kit
**Motivos para descarte:** Biblioteca mais genérica, @atlaskit é mais específico para este caso de uso Kanban.

---

## 11. Resumo das Descobertas

### Elementos a Manter (NÃO mexer)
| Função | Linhas | Uso |
|--------|--------|-----|
| `moveCard` | 806-826 | Menu "Mover para..." |
| `reorderCard` | 828-876 | Menu "Reordenar" |
| `addCard` | 674-739 | Adicionar candidato via modal |
| `removeCard` | 741-804 | Remover candidato |

### Elementos a Remover
| Elemento | Linhas | Motivo |
|----------|--------|--------|
| Ghost element | ~1651-1673 | Código morto, @atlaskit cuida |
| `MoveCardDropdown` | ~1700-1748 | Código morto, nunca usado |
| CSS `.custom-ghost` | ~85 | Removido junto com ghost |
| CSS `.drop-target` | ~86 | Feedback diferente com @atlaskit |

### Elementos a Migrar
| Elemento | Tipo | Ação |
|----------|------|------|
| Cards | Draggable + DropTarget | Substituir por @atlaskit |
| Colunas | DropTarget | Substituir por @atlaskit |
| ColHeader | Draggable | Substituir por @atlaskit |
| Estado de drag | 5 variáveis | Reduzir para 3 |
| Funções de drag | 5 funções | Remover todas |

---

## 12. Validações Finais Antes de Executar

- [ ] `dragPos` não é usado em nenhum outro lugar além do ghost
- [ ] `MoveCardDropdown` não aparece em nenhum lugar do render
- [ ] `ColHeader` recebe `ref` corretamente
- [ ] Logging é preservado com os mesmos parâmetros
- [ ] Menu "Reordenar" continua funcionando após migração
- [ ] Menu "Mover para..." continua funcionando após migração
