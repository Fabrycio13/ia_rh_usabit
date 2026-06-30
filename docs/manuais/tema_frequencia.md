# Tema Frequência — Padrão Visual

> Documentação completa do tema visual "Frequência" para referência do @designer.
> Este tema substitui o azul padrão por uma paleta verde com animações de batimento cardíaco (ECG).

---

## 1. Paleta de Cores

### Variáveis CSS sobrescritas

| Variável CSS | Valor | Uso |
|---|---|---|
| `--primary` | `#22c55e` | Cor principal (verde), botões, links ativos, badges |
| `--primary-hover` | `#16a34a` | Hover em elementos primários |
| `--primary-light-bg` | `rgba(34, 197, 94, 0.1)` | Fundo leve para badges/ícones |
| `--primary-border` | `rgba(34, 197, 94, 0.2)` | Bordas de elementos com destaque |
| `--primary-text-light` | `#86efac` | Texto verde claro em fundos escuros |
| `--primary-rgb` | `34, 197, 94` | Versão RGB para `rgba()` dinâmico |
| `--secondary` | `#16a34a` | Cor secundária (verde escuro), gradientes |
| `--bg-sidebar` | `#060d08` | Fundo da sidebar (verde muito escuro, quase preto) |
| `--sidebar-active` | `rgba(34, 197, 94, 0.12)` | Fundo do item ativo na sidebar |
| `--sidebar-active-text` | `#22c55e` | Texto do item ativo na sidebar |

### Cores fixas usadas em containers (inline)

| Contexto | Cor |
|---|---|
| Container background (filter bars, colunas) | `#060d08` |
| Borda de containers | `rgba(34, 197, 94, 0.15)` |
| Drag-over highlight | `rgba(34, 197, 94, 0.06)` |
| Card background (cards com classe `.card-frequence`) | `var(--bg-card)` |
| Card border | `rgba(34, 197, 94, 0.2)` |

---

## 2. Componentes de Background

### 2.1 HeartbeatBackground

**Arquivo:** `src/common/components/ui/HeartbeatBackground.tsx`

**Interface:**
```ts
interface HeartbeatBackgroundProps {
  color?: string;        // default: '#22c55e'
  opacity?: number;      // default: 0.25
  speed?: number;        // default: 3 (duração do ciclo em segundos)
  delay?: number;        // default: 0 (para sequenciamento entre cards)
  overlayColor?: string; // default: 'var(--bg-card)' (cor do overlay que cobre/revela)
}
```

**Técnica de animação:** SVG estático + 2 overlays com `transform: scaleX()` e `transform-origin: left center`.

**Timeline do ciclo (`speed` segundos):**
- **0–33%:** fade-in — overlay direito com `scaleX(1 → 0)` revela a linha da ESQUERDA para DIREITA
- **33–67%:** linha 100% visível (repouso)
- **67–100%:** fade-out — overlay esquerdo com `scaleX(0 → 1)` cobre da ESQUERDA para DIREITA

**SVG:**
- `viewBox="0 0 150 80"`
- `preserveAspectRatio="none"` (esticar)
- Polyline com padrão ECG: P wave → QRS spike → T wave
- Baseline centralizada em `y=40`, R spike em `y=4`

**Uso típico:**
```tsx
<div style={{ position: 'relative', overflow: 'hidden' }}>
  <HeartbeatBackground
    color="#22c55e"
    opacity={0.2}
    speed={3}
    overlayColor="var(--bg-card)"
  />
  <div style={{ position: 'relative', zIndex: 3 }}>
    {/* conteúdo do card */}
  </div>
</div>
```

**Sequenciamento entre cards:**
- Controlado por estado React (`activeFreqCard` com `setInterval` a cada 3s)
- Só renderiza `HeartbeatBackground` no card ativo: `{idx === activeFreqCard && <HeartbeatBackground />}`
- Sequência: Card 0 → Card 1 → Card 2 → Card 3 → reinicia
- UM card por vez (sem overlap), cada um monta/desmonta fresh

**⚠️ IMPORTANTE:** NÃO usar `animation-delay` CSS para sequenciamento — só atrasa a primeira iteração. Usar React mount/unmount.

### 2.2 FrequenceBackground

**Arquivo:** `src/common/components/ui/FrequenceBackground.tsx`

Background de tela cheia (`position: fixed; z-index: -1`):

- **Gradiente radial:** `#0a1a0a → #030803 → #000000`
- **3 glows pulsando** via `::before`:
  - Opacidade 0.02–0.04
  - Ciclo de 8 segundos
- **20 partículas verdes flutuantes:**
  - Tamanho 1–3px
  - Duração 8–22s
  - Drift suave

**NÃO tem linha ECG** — o batimento fica só nos cards (`HeartbeatBackground`).

---

## 3. Padrões de Container

### Regra #1: Filter bars e containers de fundo escuro

```tsx
// Antes:
<div style={{
  background: 'var(--bg-main)',
  border: '1px solid var(--border)',
  ...
}}>

// Depois (com useTheme):
const { bgTheme } = useTheme();

<div style={{
  background: bgTheme === 'frequence' ? '#060d08' : 'var(--bg-main)',
  border: bgTheme === 'frequence'
    ? '1px solid rgba(34,197,94,0.15)'
    : '1px solid var(--border)',
  ...
}}>
```

### Regra #2: Badges, labels, dots

```tsx
// Antes:
color: '#3b82f6'  // ou '#6366f1'
background: 'rgba(59, 130, 246, 0.1)'

// Depois:
color: 'var(--primary)'
background: 'var(--primary-light-bg)'
```

### Regra #3: Bordas e box-shadows

```tsx
// Antes:
border: '1px solid rgba(59, 130, 246, 0.15)'
boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'

// Depois:
border: '1px solid var(--primary-border)'
boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)'
```

### Regra #4: Gradientes com cor secundária

```tsx
// Antes:
background: 'linear-gradient(135deg, var(--primary), #7c3aed)'

// Depois:
background: 'linear-gradient(135deg, var(--primary), var(--secondary))'
```

Onde `--secondary` é `#16a34a` no modo frequência.

### Regra #5: CSS classes ativas

```css
/* Antes */
.cs-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

/* Depois */
.cs-item.active { background: var(--primary-light-bg); color: var(--primary); }
```

### Regra #6: CSS dinâmico em arquivos com `<style>`

```tsx
// Antes:
const css = `...cores hardcoded...`

// Depois:
const getCss = (bgTheme: string) => `...cores condicionais...`

// Uso:
<style>{getCss(bgTheme)}</style>
```

---

## 4. Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/core/contexts/ThemeContext.tsx` | Adicionado `--secondary`, `--bg-sidebar`, removeProperty dos mesmos |
| `src/common/components/ui/HeartbeatBackground.tsx` | **NOVO** — componente de pulsação ECG |
| `src/common/components/ui/FrequenceBackground.tsx` | Reescrito — partículas flutuantes, sem ECG |
| `src/common/components/ui/HeartbeatLineBackground.tsx` | **DELETADO** — substituído pelo HeartbeatBackground |
| `src/index.css` | Removido `.card-frequence::before` (SVG data-URI), fix `.card-frequence` background |
| `src/pages/dashboard/Dashboard.tsx` | KPI cards com HeartbeatBackground sequencial (`setInterval` + `activeFreqCard`) |
| `src/pages/dashboard/AdminLogs.tsx` | Filter bar, badges, paginação dentro do container |
| `src/pages/dashboard/AdminDashboard.tsx` | Filter bar, `.cs-item.active`, `#3b82f6` → `var(--primary)` |
| `src/pages/candidates/CandidateBank.tsx` | Filter bar, SelectFilter (cores dos itens selecionados) |
| `src/pages/candidates/Pipeline.tsx` | CSS dinâmico, colunas, dots `#3b82f6` → `var(--primary)` |
| `src/pages/analysis/Analises.tsx` | Tab bar + filter bar, `bgTheme` no JobDetailView |
| `src/pages/vagas/VagaForm.tsx` | Banner com HeartbeatBackground, `#7c3aed` → `var(--secondary)`, gradiente `#3b82f6,#2563eb` → `var(--primary),var(--secondary)` |
| `src/pages/vagas/Vagas.tsx` | Botão "Nova Vaga" hover: `#4f46e5` → `filter: brightness(0.85)` |
| `src/pages/vagas/PoolTalentos.tsx` | `#7c3aed` → `var(--secondary)`, `#6366f1` → `var(--primary)` |
| `src/pages/vagas/VagaCandidatos.tsx` | `#7c3aed` → `var(--secondary)` |
| `src/layouts/Sidebar.tsx` | Gradiente SVG com `var(--primary)/var(--secondary)`, hover com variáveis |

---

## 5. Armadilhas Conhecidas (NÃO FAZER)

1. ❌ **NÃO usar `animation-delay` CSS** para sequenciamento — só atrasa a primeira iteração
2. ❌ **NÃO usar SVG data-URI como background** — `.card-frequence::before` foi removido
3. ❌ **NÃO usar `inset: 0` + animação de `width`** nos overlays — conflito de layout. Usar `scaleX()` + `transform-origin`
4. ❌ **NÃO usar `stroke-dashoffset`** para pulsação — usar fade-in/fade-out overlay com `scaleX`
5. ❌ **NÃO usar `preserveAspectRatio="xMidYMid meet"`** no SVG do HeartbeatBackground — usar `"none"` pra esticar
6. ❌ **NÃO hardcodar `#3b82f6`, `#6366f1`, `#7c3aed`** — usar `var(--primary)`, `var(--secondary)`, `var(--primary-light-bg)`

---

## 6. Checklist para Novas Páginas no Tema Frequência

- [ ] Filter bars usam `#060d08` + borda `rgba(34,197,94,0.15)` quando `bgTheme === 'frequence'`
- [ ] Badges/labels/dots usam `var(--primary)` + `var(--primary-light-bg)`
- [ ] Gradientes usam `var(--secondary)` em vez de `#7c3aed`
- [ ] Box-shadows usam `rgba(var(--primary-rgb), ...)` em vez de hardcoded azul
- [ ] Classes CSS ativas (`.cs-item.active`, etc.) usam `var(--primary)` + `var(--primary-light-bg)`
- [ ] Zero hardcode de `#3b82f6`, `#6366f1`, `#7c3aed`
- [ ] Se usar HeartbeatBackground: sequenciamento via React mount/unmount, NUNCA `animation-delay`
- [ ] Background da página usa `FrequenceBackground` quando `bgTheme === 'frequence'`
