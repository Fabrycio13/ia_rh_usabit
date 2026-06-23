# Otimização do Painel Administrador para Mobile

## Problema

As páginas `/admin` (AdminDashboard) e `/admin/logs` (AdminLogs) não têm nenhum tratamento responsivo. Em mobile (<768px) os layouts quebram: tabelas fixas, grids de 3 colunas, inputs com largura fixa, calendário e gráfico lado a lado.

## Arquivos

| Arquivo | Tamanho | Prioridade |
|---|---|---|
| `src/pages/dashboard/AdminDashboard.tsx` | 668 linhas | Alta |
| `src/pages/dashboard/AdminLogs.tsx` | 510 linhas | Alta |
| `src/common/components/ui/DatePicker.tsx` | 157 linhas | Média (ajuste no mobile width) |

---

## 0. `isMobile` detection (ambos os arquivos)

Adicionar no estado do componente, logo após os outros `useState`:

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

---

## 1. AdminDashboard.tsx

### 1a. Import DatePicker (linha 4)

Adicionar após a última importação de lucide-react:
```tsx
import DatePicker from '../../common/components/ui/DatePicker';
```

### 1b. Header (linhas 276-286)

| Onde | De | Para (isMobile) |
|---|---|---|
| `ShieldCheck size={32}` | `size={32}` | `size={24}` |
| `fontSize: '32px'` (h1) | `'32px'` | `'22px'` |

### 1c. Org Filter (linhas 288-327)

| Onde | De | Para (isMobile) |
|---|---|---|
| `flexWrap: 'nowrap'` (linha 289) | `'nowrap'` | `'wrap'` |
| Container do select `minWidth: '320px'` (linha 292) | `'320px'` | `'100%'` |
| Label (linha 290) | mostrar sempre | esconder (`{!isMobile && <span>...`}) |

### 1d. Stats Cards (linhas 331-347)

| Onde | De | Para (isMobile) |
|---|---|---|
| `gridTemplateColumns` | `'repeat(3, 1fr)'` | `'1fr'` |
| `gap: '20px'` | `'20px'` | `'12px'` |
| `marginBottom: '32px'` | `'32px'` | `'20px'` |
| Padding dos cards (linha 337) | `'20px'` | `'14px'` |

### 1e. Charts + Calendar (linhas 350-484)

**Grid exterior (linha 350):**
| De | Para (isMobile) |
|---|---|
| `gridTemplateColumns: '1fr 340px'` | `'1fr'` |
| `gap: '20px'` | `'12px'` |

**Gráfico card (linha 352):**
| Onde | De | Para (isMobile) |
|---|---|---|
| `padding: '24px'` | `'24px'` | `'14px'` |
| `height: '300px'` (linha 366) | `'300px'` | `'180px'` |

**Calendário card (linhas 417-482):**
`Dashboard.tsx` já implementa o padrão certo: em mobile, substituir o calendário inline por dois `<DatePicker compact>`.

Implementar assim:

```tsx
// Substituir o conteúdo de <div> calendário (linhas 417-482) por:
<div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
  {isMobile ? (
    <>
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Filtro</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>Período:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
          <DatePicker compact value={rangeStart || ''} onChange={val => setRangeStart(val || null)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
          <DatePicker compact value={rangeEnd || ''} onChange={val => setRangeEnd(val || null)} />
        </div>
      </div>
      {(rangeStart || rangeEnd) && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <button onClick={clearRange} style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: '8px', padding: '6px 14px', color: 'var(--text-error)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <X size={14} /> Limpar filtros
          </button>
        </div>
      )}
    </>
  ) : (
    // manter o calendário inline existente (linhas 419-482) exatamente como está
  )}
</div>
```

### 1f. Filter Bar (linhas 487-552)

| Onde | De | Para (isMobile) |
|---|---|---|
| Search container `width: '240px'` (linha 488) | `'240px'` | `'100%'` |
| Role select container `width: '160px'` (linha 506) | `'160px'` | `'100%'` |
| Status select container `width: '160px'` (linha 524) | `'160px'` | `'100%'` |
| Divider vertical (linha 501) | mostrar | esconder (`{!isMobile && <div ... />}`) |
| Botão "Limpar Filtros" (linhas 544-551) | padding `7px 12px` | padding `7px 10px` |

Além disso, os `.cs-dropdown` devem ter `right: 0` em mobile para não vazar pra fora:
```tsx
// Adicionar no CSS inline ou no style do dropdown:
...(isMobile ? { right: 0, maxWidth: 'calc(100vw - 32px)' } : {})
```

### 1g. User Table (linhas 554-665)

| Onde | De | Para (isMobile) |
|---|---|---|
| Envolver a `<table>` em `<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>` (linha 556) | — | adicionar wrapper |
| Padding das células `td` (linhas 581, 608, 613, 626, 634) | `'16px'` | `'10px 8px'` |
| Botão "Desativar/Ativar" padding (linha 640) | `'6px 12px'` | `'10px 12px'` (aumentar touch target) |
| Estilo do botão: fontSize | `'12px'` | `'11px'` |
| Avatar (linha 583-596): `width/height: 32` | `32` | `28` |

---

## 2. AdminLogs.tsx

### 2a. Header (linhas 190-201)

| Onde | De | Para (isMobile) |
|---|---|---|
| `Database size={32}` | `size={32}` | `size={24}` |
| `fontSize: '32px'` (h1) | `'32px'` | `'22px'` |

### 2b. Filter area (linhas 204-366)

| Onde | De | Para (isMobile) |
|---|---|---|
| DatePicker sem compact (linhas 212, 219) | `<DatePicker>` | `<DatePicker compact>` |
| Período container flex-wrap (linha 209) | — | `flexWrap: isMobile ? 'wrap' : 'nowrap'` |
| Org container `minWidth: '240px'` (linha 232) | `'240px'` | `'100%'` |
| Search container `width: '200px'` (linha 269) | `'200px'` | `'100%'` |
| Status container `width: '160px'` (linha 281) | `'160px'` | `'100%'` |
| Divider vertical (linha 226) | mostrar | esconder em mobile |
| Botão "Limpar" + "Atualizar" (linhas 323-365): `gap: 8` | `'8px'` | `'4px'` |
| Botão "Atualizar" padding (linha 338) | `'10px 20px'` | `'10px 14px'` |
| `.cs-dropdown` (linhas 173-178) | `left: 0` | adicionar `right: 0` em mobile |

Agrupamento do período em mobile:
```tsx
// Em mobile, o grupo "Período" (linhas 208-224) deve empilhar:
<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
  <span style={{ fontSize: 12, ... }}>Período:</span>
  <div style={{ display: 'flex', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
      <span style={{ ... }}>De:</span>
      <DatePicker compact value={startDate} onChange={...} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
      <span style={{ ... }}>Até:</span>
      <DatePicker compact value={endDate} onChange={...} />
    </div>
  </div>
</div>
```

### 2c. Logs Table (linhas 377-446)

| Onde | De | Para (isMobile) |
|---|---|---|
| Wrapper já tem `overflowX: 'auto'` (linha 377) | ✅ OK | adicionar `WebkitOverflowScrolling: 'touch'` |
| Padding células (linhas 398, 404, 410, 415, 428) | `'16px'` | `'10px 8px'` |
| Coluna "Detalhes" (linha 415): `maxWidth: '300px'` | `'300px'` | `'150px'` |
| Status/Erro badge (linhas 430-439): padding | `'6px 10px'` | `'4px 6px'`, fontSize `'12px'` → `'10px'` |

### 2d. Empty state (linha 371)

| De | Para (isMobile) |
|---|---|
| `padding: '64px'` | `padding: isMobile ? '32px 16px' : '64px'` |
| `Info size={40}` | `size={isMobile ? 28 : 40}` |

### 2e. Pagination (linhas 450-502)

| Onde | De | Para (isMobile) |
|---|---|---|
| Container (linha 451): `padding: '14px 20px'` | `'14px 20px'` | `'12px 14px'` |
| Orientation (linha 451) | `row` (flex-direction padrão) | `flexDirection: 'column'`, `gap: '8px'` |
| Page buttons (linha 477): `width: 34, height: 34` | `34` | `30` |
| "Anterior"/"Próximo" padding (linhas 459, 497) | `'7px 14px'` | `'6px 10px'` |
| "Anterior"/"Próximo" text | mostrar | em mobile, mostrar só os ícones (`<ChevronLeft/>` / `<ChevronRight/>`) sem texto |

---

## 3. OwnerPanels.tsx (dentro de Configuracoes)

### 3a. OwnerAdminApiPanel (linha 131)

| Onde | De | Para (isMobile) |
|---|---|---|
| `gridTemplateColumns` | `'2fr 1.5fr 1fr'` | `'1fr'` |
| Padding accordion content (linha 130) | `'0 20px 20px'` | `'0 14px 14px'` |

OwnerPanels.tsx precisa receber `isMobile` como prop. Em Configuracoes.tsx:
```tsx
// Ao renderizar OwnerAdminApiPanel e OwnerAdminPlanPanel, passar:
<OwnerAdminApiPanel isMobile={isMobile} />
<OwnerAdminPlanPanel isMobile={isMobile} />
```

### 3b. OwnerAdminPlanPanel table (linhas 262-359)

| Onde | De | Para (isMobile) |
|---|---|---|
| Envolver `<table>` em div com `overflowX: 'auto'` | — | adicionar |
| Legend grid `repeat(4, 1fr)` (linha 363) | `'repeat(4, 1fr)'` | `'repeat(2, 1fr)'` |

---

## 4. DatePicker.tsx (ajuste global no mobile)

### 4a. Calendar modal width (linha 104)

| De | Para |
|---|---|
| `width: '300px'` | `maxWidth: '300px'; width: 'calc(100vw - 32px)'` |

Isso garante que em iPhone SE (320px) sobre margem de 16px de cada lado.

---

## Resumo de alterações por arquivo

| Arquivo | Linhas alteradas | Tipo de mudança |
|---|---|---|
| `AdminDashboard.tsx` | ~30 | `isMobile` detection, inline styles condicionais, import DatePicker |
| `AdminLogs.tsx` | ~25 | `isMobile` detection, inline styles condicionais, DatePicker compact |
| `OwnerPanels.tsx` | ~8 | Receber `isMobile` prop, grid collapse |
| `Configuracoes.tsx` | ~2 | Passar `isMobile` pros OwnerAdmin*Panel |
| `DatePicker.tsx` | ~1 | `width` → `maxWidth` + `calc` |

## Não fazer

- Não mexer na lógica de negócio (filtros, queries, permissões)
- Não alterar `DashboardLayout.tsx` ou `Sidebar.tsx`
- Não criar `@media` queries novas — usar `isMobile` state padronizado
- Não refatorar o calendário inline do desktop — só trocar por DatePicker compact no mobile
- Não mexer no CSS global (`index.css`)
