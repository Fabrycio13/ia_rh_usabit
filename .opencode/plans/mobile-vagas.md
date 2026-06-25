# Plano: Otimização Mobile — Gestão de Vagas

**Branch**: `nova-hierarquia-perfis` | **Data**: 2026-06-25 | **Base**: `specs/nova-hierarquia-perfis/plan.md`

## Sumário

Adaptar as páginas internas de gestão de vagas para telas < 768px seguindo o padrão `isMobile` já utilizado em `AdminDashboard.tsx`, `Dashboard.tsx` e `PoolTalentos.tsx`.

## Abordagem

- **Breakpoint**: 768px (consistente com o resto do projeto)
- **Detecção**: `window.matchMedia('(max-width: 768px)')` com listener em cada página
- **Estilo**: inline styles condicionais (`isMobile ? 'column' : 'row'`) — sem `@media` queries
- **Sem hooks compartilhados**: cada página mantém seu próprio `isMobile` state (padrão do projeto)
- **Touch targets mínimos**: 44px (botões de ação), 32px (botões de página/pagination)
- **Sem mudanças na lógica de negócio**: apenas layout, padding, visibilidade, orientação
- **Performance mobile**: desabilitar animações CSS decorativas pesadas em mobile

## Arquivos

| Arquivo | Linhas | Prioridade | Tipo de mudança |
|---------|--------|------------|-----------------|
| `Vagas.tsx` | 1989 | Alta | Tabela → cards, filtros empilhados, paginação simplificada |
| `VagaForm.tsx` | 2309 | Alta | StepIndicator vertical, grids colapsados, animações off, performance |
| `VagaCandidatos.tsx` | 546 | Alta | Grid de 9 colunas → cards, header responsivo, detail panel fullscreen |
| `PoolTalentos.tsx` | 867 | Média | Já tem `isMobile` parcial; refinamento de filtros e alinhamento com padrão |
| `CareerPortalHub.tsx` | 161 | Média | Header empilhado, tabs com scroll horizontal |
| `StepIndicator.tsx` | 113 | Média | Suporte a layout vertical |
| `RadioGroup.tsx` | 98 | Média | Aceitar `mobileColumns` ou `isMobile` prop |
| `ToggleField.tsx` | 57 | Baixa | FlexWrap no label em telas estreitas |
| ~~`PortalPreview.tsx`~~ | 208 | — | **REMOVER do escopo**: componente não é usado em nenhum lugar |

---

## 1. Vagas.tsx (~55 linhas alteradas)

### 1a. `isMobile` detection (linha ~120)
```tsx
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    check(mq);
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
}, []);
```

### 1b. Header (linhas 795-806)
- `Briefcase size={32}` → `size={24}` em mobile
- `fontSize: '32px'` → `'22px'`

### 1c. Actions Bar / Filtros (linhas 810-1046)
- **Search input**: `minWidth: '250px'` → `'100%'` em mobile
- **Org filter** (Owner): `width: 220px` → `'100%'`. O `.cs-dropdown` precisa de `maxWidth: 'calc(100vw - 32px)'` para não vazar
- **Cargo filter**: `width: 350px` → `'100%'`. Dropdown: `right: 0`, `maxWidth: 'calc(100vw - 32px)'`
- **Status filter**: `width: 180px` → `'100%'`
- **Period filter**: `marginLeft: 'auto'` → remover (`marginLeft: 0`). Empilhar em coluna: label + linha dos dois DatePickers. Usar `<DatePicker compact>` nos dois
- **"Nova Vaga" button**: full-width, centralizado. Se houver outros filtros ativos, ele fica na linha de baixo

### 1d. Tabela → Cards (linhas 1070-1385)

Em mobile, renderizar cada vaga como card em vez do grid de 9 colunas:

**Card structure** (alinhado com o padrão de `PoolTalentos.tsx` que usa padding `12px 14px` e `borderRadius: 12`):
```
┌─────────────────────────────────┐
│ [job_code]          [Status ⬇] │
│                                 │
│ Título da Vaga (clicável)       │
│ badges: [RPO] [Confidencial]    │
│                                 │
│ 📍 Localização                  │
│ 📅 15/06/2026  •  CLT          │
│ 👥 12 candidaturas              │
│                                 │
│ [🔗] [👁] [✏️] [🗑️]            │
└─────────────────────────────────┘
```

- **Wrapper**: `background: 'var(--bg-card)'`, `border: '1px solid var(--border)'`, `borderRadius: 12`, `padding: 14px`
- **Título**: clicável → navega para `/pipeline?vagaId=...` (mesma lógica do desktop)
- **Status dropdown**: mantido inline no card, mesmo componente de botão
- **Ações**: botões com touch targets ≥ 44px (`padding: '10px'`, `minWidth: 44`, `minHeight: 44`). Alinhados à direita com `gap: 8px`
- **Badges**: tags de RPO, confidencial, PcD mantidas abaixo do título
- **Grid do card**: `display: 'flex', flexDirection: 'column', gap: '10px'`

**BLIND SPOT ⚠️**: O dropdown de status usa `position: 'fixed'` com `getBoundingClientRect()` do botão. Em mobile com cards, o `rect` ainda funciona, mas o dropdown pode ficar cortado na parte inferior da tela. Verificar se `openUpward` está sendo calculado corretamente — aumentar `spaceBelow` threshold de `estimatedHeight` para `estimatedHeight + 20`.

### 1e. Paginação (linhas 1390-1482)
- Empilhar info + buttons em coluna: `flexDirection: 'column', gap: '12px'`, `alignItems: 'center'`
- Page buttons: `width: 32, height: 32` → manter em `32` (já é pequeno, reduzir mais dificulta toque)
- "Anterior"/"Próximo": trocar texto por ícones `<ChevronLeft/>` / `<ChevronRight/>` em mobile

### 1f. Status Dropdown (linhas 1486-1543)
- `minWidth: '140px'` → `minWidth: '160px'` em mobile
- Itens com `padding: '8px 12px'` → `'10px 14px'` (maior touch target)

### 1g. Modais (delete, email, pipeline, reopen)
- Modais já usam `width: '90%'` / `maxWidth: '420px'` — OK
- Reduzir padding interno: `padding: '32px'` → `'20px'` em mobile
- **BLIND SPOT ⚠️**: O modal de "close email breakdown" tem seções expansíveis (`openSections`). Verificar se a lista de candidatos dentro dele não quebra em mobile

### 1h. Convidado view
- Quando `userRole === 'convidado'`: status é só badge (sem dropdown), ações limitadas. O card móvel deve manter esse comportamento

---

## 2. VagaForm.tsx (~100 linhas alteradas)

**BLIND SPOT ⚠️**: Arquivo de 2309 linhas com 4 steps, PlannedOverlay, SVG waves, 40 estrelas animadas, animações CSS pesadas. O plano precisa cobrir performance mobile.

### 2a. `isMobile` detection (linha ~197)
```tsx
const [isMobile, setIsMobile] = useState(false);
useEffect(() => { /* padrão matchMedia 768px */ }, []);
```

### 2b. Banner / Header (linhas 664-768)
- `padding: '80px 40px'` → `'32px 20px'` em mobile
- `fontSize: '36px'` → `'24px'` no título
- `fontSize: '15px'` → `'13px'` no subtítulo

### 2c. Container principal (linha 771)
- `padding: '0 40px 80px'` → `'0 12px 60px'` em mobile

### 2d. Seções (sectionStyle, linha 635)
- Criar `sectionStyleMobile`: `padding: '20px'`, `borderRadius: '20px'` (vs `32px` e `32px` do desktop)

### 2e. StepIndicator → vertical (linha 773)
- Passar `vertical={isMobile}` para `StepIndicator`
- Ver seção 7 para detalhes do componente

### 2f. Grids internos — colapsar para 1 coluna
| Onde | Linha | Desktop | Mobile |
|------|-------|---------|--------|
| Salary range grid | 1151 | `1fr 1fr` | `1fr` |
| RadioGroup contract type | 1230 | `columns={4}` | `columns={2}` |
| RadioGroup work regime | 1267 | `columns={3}` | `columns={1}` (stack vertical) |
| RadioGroup PcD | 1303 | `columns={3}` | `columns={1}` |
| Status inicial buttons | 885 | `flex row` | `flexDirection: 'column'` |
| **BLIND SPOT**: Step 4 conditional logic selects | ~1890 | `1fr 1fr` grid | `1fr` empilhado |
| **BLIND SPOT**: Step 4 complementary field | ~1992 | `1fr 1fr` grid | `1fr` empilhado |

### 2g. RadioGroups — passar `mobileColumns`
O `RadioGroup` componente aceita `columns` mas não tem noção de mobile. Soluções:
- **Opção A (recomendada)**: Adicionar prop `mobileColumns` ao RadioGroup. No VagaForm, passar `columns={4} mobileColumns={isMobile ? 2 : 4}`
- **Opção B**: Adicionar `isMobile` prop ao RadioGroup e ele mesmo decidir

**Decisão**: Opção A — `mobileColumns` é mais flexível e não acopla o RadioGroup ao matchMedia.

### 2h. ToggleField — responsivo
ToggleField usa `justifyContent: 'space-between'` com label + toggle lado a lado. Em telas muito estreitas (320px), labels longos podem quebrar.

**Ação**: Adicionar prop `isMobile` ao ToggleField. Em mobile, usar `flexDirection: 'column'`, `alignItems: 'flex-start'`, `gap: '8px'` com toggle à direita do label. Ou usar `flexWrap: 'wrap'`.

### 2i. Navigation buttons
- Empilhar em coluna: `flexDirection: 'column-reverse'` (submit primeiro, depois voltar/cancelar)
- Botões full-width com `minHeight: 48px`
- Último step: "Voltar para Vagas" + "Cancelar" + "Publicar" — empilhar verticalmente, "Publicar" no topo

### 2j. Pipeline modal (linhas 2168-2306)
- `padding: '40px'` → `'24px'` em mobile
- `maxWidth: '520px'` → `width: 'calc(100% - 32px)'`, `margin: '0 16px'`

### 2k. Performance mobile — Animações (BLIND SPOT CRÍTICO)

**Problema**: O VagaForm renderiza 40 estrelas animadas, SVG wave patterns com `stroke-dashoffset`, planetas flutuantes com `filter: blur`, e botão publish com gradiente animado + pseudo-elemento shine. Em dispositivos mobile de baixo custo, isso causa queda de frames.

**Solução**: Usar `isMobile` para condicionalmente NÃO renderizar elementos decorativos pesados:
- **Estrelas animadas** (linhas 713-727): `{!isMobile && [...Array(40)].map(...)}` — pular em mobile
- **SVG waves** (linhas 685-706): `{!isMobile && bgTheme === 'spatial' && <svg>...}` — pular em mobile
- **Planeta flutuante** (linhas 730-753): `{!isMobile && <div className="planet">...}` — pular em mobile
- **PlanetOverlay components**: já memoizados, mas ainda consomem memória. Pular quando não usados
- **Botão publish gradient animation** (`.btn-publish`): manter, a animação de gradiente é feita via CSS nativo e tem boa performance. Mas remover o `::after` shine em mobile

**Benefício**: Reduz de ~45 elementos animados para 0-2, melhorando drasticamente o scroll e a capacidade de resposta em mobile.

### 2l. Step 4 — Jornada do Candidato (linhas 1700-2025)

UI complexa com perguntas customizadas, lógica condicional, opções do tipo choice, campo complementar.

- **Grid `1fr 1fr`** dos selects de lógica condicional (linha ~1890): mudar para `flexDirection: 'column'` em mobile
- **Grid `1fr 1fr`** do campo complementar (linha ~1992): mudar para `'1fr'` em mobile
- **Lista de opções**: cada opção é uma linha com GripVertical + input + Trash2. Em mobile, manter mesma estrutura, inputs já ocupam espaço flexível
- **Botão "Adicionar Pergunta"** e "Adicionar Opção": full-width em mobile

---

## 3. VagaCandidatos.tsx (~35 linhas alteradas)

### 3a. `isMobile` detection (linha ~84)
```tsx
const [isMobile, setIsMobile] = useState(false);
useEffect(() => { /* padrão matchMedia 768px */ }, []);
```

### 3b. Header (linhas 257-293)
- Container `padding: '24px'` → `'16px'` em mobile
- `fontSize: 32` → `24` no título
- `flexDirection: 'row'` → `'column'`, `alignItems: 'flex-start'` (empilhar seta voltar + título verticalmente)
- Informações da vaga (company_name, candidatos count): manter inline, mas reduzir gap

### 3c. Grid de candidatos → cards (linhas 296-546)

**Desktop** (mantido): `gridColumns = '50px 1.3fr 1.1fr 0.5fr 0.7fr 0.7fr 0.6fr 0.4fr 0.4fr'`

**Mobile** — cards no estilo de `PoolTalentos.tsx`:
```
┌────────────────────────────────────┐
│ [Avatar] Nome do Candidato   72%  │
│         email@exemplo.com         │
│         📍 Localização            │
│                                    │
│ [Status: Pendente]                 │
│                                    │
│ [📄 Currículo]   [👁 Detalhes]     │
└────────────────────────────────────┘
```
- **Header do card**: avatar com inicial (40x40, gradiente) + nome + email + score
- **Informações**: localização, idade, gênero (opcional — pode ocultar idade/gênero para simplificar)
- **Status badge**: mesma cor/lógica do desktop
- **Ações**: botões com touch targets mínimos de 44x44px
- **Colunas removidas em mobile**: Rank (#), Idade, Gênero — espaço ocupado por nome + status
- **Esconder coluna "Currículo"**: substituir por botão de ação no card

### 3d. Candidate Detail Panel (linha 229+)
- Quando `selectedCandDetail` é aberto em mobile:
  - `position: 'fixed'`, `inset: 0`, `zIndex: 50`, `overflowY: 'auto'`
  - Background overlay semi-transparente
  - Botão "Voltar"/Fechar no topo esquerdo (touch target ≥ 44px)
  - Conteúdo ocupa 100% da largura com padding `16px`
- Comportamento desktop mantido como está

### 3e. TalentTransferModal
- Já é um modal (overlay fixo). Em mobile: `width: '90%'`, `padding: '20px'`
- Verificar se o conteúdo interno não quebra (lista de vagas destino)

---

## 4. PoolTalentos.tsx (~20 linhas alteradas)

O arquivo já tem `isMobile` detection e card view funcionais. Refinamentos:

### 4a. Period filter
- Verificar se os DatePickers usam `compact` em mobile — se não, adicionar
- O período filter já empilha em coluna? Confirmar e garantir que sim

### 4b. Filtro de data — quebra em telas muito pequenas
- Testar em 375px: dois DatePickers lado a lado com label "De:" e "Até:" podem não caber
- Se necessário: empilhar em coluna (um DatePicker por linha)

### 4c. Pagination
- Alinhar estilo com o padrão definido em Vagas.tsx:
  - Info + buttons em coluna
  - Page buttons 32x32px (manter atual, já é funcional)
  - Texto "Anterior"/"Próximo" → ícones em mobile

### 4d. "Adicionar ao Pool" + "Reanalisar candidatos" buttons
- Garantir que são full-width em mobile e têm `minHeight: 44px`

---

## 5. CareerPortalHub.tsx (~20 linhas alteradas)

### 5a. `isMobile` detection
```tsx
const [isMobile, setIsMobile] = useState(false);
useEffect(() => { /* padrão */ }, []);
```

### 5b. Header (linhas 80-106)
- `marginBottom: '32px'` → `'20px'` em mobile
- Container `flexDirection: 'row'` → `'column'`, `alignItems: 'flex-start'` (empilhar título + ações)
- Icone: `size={32}` → `size={24}`
- `fontSize: '32px'` → `'22px'` no h1

### 5c. Ações do portal (linhas 88-105)
- Container `flexDirection: 'row'` → `'column'` em mobile, `width: '100%'`
- Ambos os botões: `width: '100%'`, `justifyContent: 'center'`
- Gap entre botões: `12px`

### 5d. Tabs (linhas 111-143)
- Já usam `display: 'flex'`. Adicionar `overflowX: 'auto'`, `WebkitOverflowScrolling: 'touch'`, `flexWrap: 'nowrap'`
- Reduzir `padding: '12px 24px'` → `'10px 14px'` em mobile
- **BLIND SPOT**: "Gestão de Vagas" (14 chars) + "Pool de Talentos" (16 chars) + "Análises" (8 chars) — em 375px com padding reduzido, cabem? Calcular: ~14ch + ~16ch + ~8ch ≈ 38ch ≈ ~280px + gaps ≈ ~320px. Cabe com folga em 375px.

### 5e. Vaga do convidado
- `isConvidado` mostra apenas a tab "vagas". Nesse caso, as tabs podem sumir totalmente em mobile (só 1 tab)

---

## 6. StepIndicator.tsx (~25 linhas alteradas)

### 6a. Nova interface
```tsx
interface Step {
    number: number;
    title: string;
    description?: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (step: number) => void;
    vertical?: boolean;
}
```

### 6b. Layout vertical (quando `vertical={true}`)
- Container: `flexDirection: 'column'`, `alignItems: 'flex-start'`, `width: '100%'`, `gap: 4px`
- **Remover** a progress line horizontal (linhas 27-43) — não faz sentido em layout vertical
- Cada step: `flexDirection: 'row'`, `alignItems: 'center'`, `width: '100%'`, `gap: 12px`, `padding: '8px 12px'`
- Circle: manter 40x40px, com check para completed, número para current/future
- Label ao lado do circle: `fontSize: '14px'`, com `fontWeight` diferenciado
- Step completado: opacidade normal, check verde, título riscado? Não — só check
- Step atual: destaque com background sutil (`rgba(99,102,241,0.06)`), border-radius `10px`
- Step futuro: opacidade reduzida (`0.5`)
- Opcional: adicionar badge "Atual" ao lado do label do step corrente

### 6c. Transição
- Usar `animation: 'fadeIn 0.3s ease-out'` no container para suavizar troca de steps em mobile

---

## 7. RadioGroup.tsx (~10 linhas alteradas)

### 7a. Adicionar prop `mobileColumns`
```tsx
interface RadioGroupProps {
    label?: string;
    options: { value: string; label: string; description?: string }[];
    value: string;
    onChange: (value: string) => void;
    columns?: 2 | 3 | 4;
    mobileColumns?: 1 | 2;
}
```

### 7b. Lógica de grid
No `getGridColumns()`:
```tsx
const getGridColumns = () => {
    const cols = isMobile && mobileColumns ? mobileColumns : columns;
    switch (cols) {
        case 1: return '1fr';
        case 2: return '1fr 1fr';
        case 3: return '1fr 1fr 1fr';
        case 4: return '1fr 1fr 1fr 1fr';
    }
};
```

### 7c. Touch targets
- `padding: '16px'` nas opções → manter (já é ≥ 44px de altura com texto)

---

## 8. ToggleField.tsx (~5 linhas alteradas)

### 8a. Adicionar prop `isMobile`
```tsx
interface ToggleFieldProps {
    label: string;
    description?: string;
    value: boolean;
    onChange: (value: boolean) => void;
    isMobile?: boolean;
}
```

### 8b. Layout responsivo
Quando `isMobile`:
- Adicionar `flexWrap: 'wrap'` no container
- Ou: `flexDirection: 'column'`, `alignItems: 'flex-start'`, gap entre label e toggle
- Toggle button mantido à direita (ou abaixo) do label
- Descrição ocupa 100% da largura

---

## Blind Spots Consolidados

| # | Blind Spot | Impacto | Solução |
|---|-----------|---------|---------|
| 1 | **Performance VagaForm**: 40 estrelas + SVG waves + PlanetOverlay + gradiente animado | Jank/queda de frames em mobile | `{!isMobile && (...)}` nos elementos decorativos pesados |
| 2 | **PortalPreview não usado em lugar nenhum** | Esforço desperdiçado | Remover do escopo |
| 3 | **RadioGroup sem noção de mobile** | Grid de 4 colunas quebra em telas pequenas | Adicionar prop `mobileColumns` |
| 4 | **ToggleField com label longo** | Label + toggle podem não caber lado a lado | Adicionar `flexWrap: 'wrap'` ou `flexDirection: 'column'` |
| 5 | **Step 4 grids `1fr 1fr`** (conditional logic, complementary field) | Inputs muito estreitos em mobile | Mudar para `1fr` empilhado |
| 6 | **Status dropdown position** (`getBoundingClientRect`) | Pode ficar cortado na parte inferior da tela | Aumentar threshold do `openUpward` |
| 7 | **VagaForm ~2309 linhas** | Mudanças estimadas em 60 → real ~100 linhas | Ajustar expectativa de esforço |
| 8 | **DatePicker calendar modal** | Já é responsivo (`calc(100vw - 32px)`) | Nenhuma ação necessária |
| 9 | **Convidado view** | Menos ações, sem dropdown de status | Manter comportamento existente no card |
| 10 | **Modais de email com breakdown** | Lista de candidatos pode quebrar | Testar em 375px |
| 11 | **Keyboard em mobile** | Inputs no final do form podem ficar ocultos | Container já faz scroll (`overflowY: 'auto'`), verificar se há padding inferior suficiente |

## Resumo de alterações

| Arquivo | Linhas alteradas (estimado) | Complexidade | Riscos |
|---------|------------------------------|--------------|--------|
| `Vagas.tsx` | ~55 | Alta | Status dropdown position em cards |
| `VagaForm.tsx` | ~100 | Alta | Tamanho do arquivo, animações |
| `VagaCandidatos.tsx` | ~35 | Alta | CandidatePanel fullscreen overlay |
| `PoolTalentos.tsx` | ~20 | Média | Baixo |
| `CareerPortalHub.tsx` | ~20 | Média | Baixo |
| `StepIndicator.tsx` | ~25 | Média | Consistência visual com desktop |
| `RadioGroup.tsx` | ~10 | Baixa | Baixo |
| `ToggleField.tsx` | ~5 | Baixa | Baixo |

## Não fazer

- Não mexer na lógica de negócio (filtros, queries, permissões, submissão)
- Não alterar `DashboardLayout.tsx` ou `Sidebar.tsx`
- Não criar hooks compartilhados — manter `isMobile` em cada página
- Não usar `@media` queries — usar `isMobile` state
- Não refatorar componentes para Tailwind — manter inline styles
- Não mexer em `PortalPreview.tsx` (fora do escopo — componente não utilizado)
- Não mexer em `DatePicker.tsx` (já está responsivo)
- Não mexer no CSS global (`index.css`)

## Dependências

1. `RadioGroup.tsx` e `ToggleField.tsx` — atualizar primeiro (são dependências do VagaForm)
2. `StepIndicator.tsx` — atualizar antes do VagaForm
3. `VagaForm.tsx` — depende de StepIndicator, RadioGroup, ToggleField
4. `Vagas.tsx`, `VagaCandidatos.tsx`, `PoolTalentos.tsx` — independentes entre si
5. `CareerPortalHub.tsx` — independente

## Testes

- **Viewports**: 375px (iPhone SE), 414px (iPhone 11/XR), 768px (iPad mini)
- **Touch targets**: todos os botões de ação ≥ 44x44px, botões de página ≥ 32x32px
- **Modals**: ocupar ≥ 90% da largura, padding confortável (≥ 20px)
- **Dropdowns**: não vazar para fora da viewport (especialmente `.cs-dropdown` com `right: 0`)
- **Status dropdown**: abrir para cima quando necessário em mobile
- **VagaForm keyboard**: ao focar input no final do form, a página deve scrollar para mostrar o campo
- **VagaForm animações**: em mobile, não deve haver estrelas/SVG/planetas animados
- **PoolTalentos**: period filter com DatePicker compact deve funcionar em 375px
- **Ações de convidado**: botões de criar/editar/excluir não devem aparecer
