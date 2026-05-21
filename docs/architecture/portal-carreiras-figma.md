# Plano: Portal de Carreiras — Figma para Código

## Objetivo

Substituir o layout da página pública `OrganizationCareerPage.tsx` pelo design
do Figma (Carreiras - Desktop), preservando 100% da lógica de dados, rotas e
fluxos existentes.

---

## Escopo invariável (nada muda)

| Item | Arquivo | Motivo |
|---|---|---|
| Rota `/carreiras/:orgId` | `App.tsx:79` | `export const OrganizationCareerPage` mantido |
| Rota `/carreiras/:orgId/candidatar` | `App.tsx:80` | Intocado |
| Rota `/v/:hash` | `App.tsx:77` | Intocado |
| Rota `/v/:hash/candidatar` | `App.tsx:78` | Intocado |
| Admin panel | `CareerPortalHub.tsx` | Intocado |
| Formulário espontâneo | `SpontaneousApplication.tsx` | Intocado |
| Página de vaga específica | `PublicJobPage.tsx` | Intocado |
| Formulário de candidatura | `JobApplication.tsx` | Intocado |
| Fetch de dados | `/functions/v1/public-jobs?orgId=` | Mantido |
| Tipos `Vaga` / `OrgInfo` | `OrganizationCareerPage.tsx:6-37` | Mantidos |
| Estados `useState` | loading, orgInfo, vagas, activeCategory, error, isMobile | Mantidos |
| Filtro por categoria | `activeCategory` + `categories` array | Mantido |
| Função `getContractTypeLabel` | `OrganizationCareerPage.tsx:163` | Mantida |
| Import `formatSalary` | `jobFormatter` | Mantido |

---

## Fluxo cirúrgico (modifica 1 arquivo, cria 8)

### Único arquivo modificado

`src/pages/vagas/OrganizationCareerPage.tsx`

**O que muda:** somente o JSX retornado. Toda a lógica (useState, useEffect,
fetch, filtros, navegação) permanece exatamente igual.

**O que é trocado:** o `<div>` monolítico com CSS inline por uma composição
de componentes importados de `./portal/`. A assinatura de exportação
(`export const OrganizationCareerPage`) não muda — as rotas em `App.tsx`
continuam funcionando sem qualquer alteração.

### Novos arquivos (pasta `src/pages/vagas/portal/`)

```
src/pages/vagas/portal/
├── types.ts              # Interfaces compartilhadas
├── data.ts               # Dados estáticos do Figma
├── NavbarPortal.tsx      # Navbar com backdrop-filter blur
├── HeroSection.tsx       # Hero + CTAs + ilustração
├── AreasSection.tsx      # Grid 2×2 de cards de área
├── VagasSection.tsx      # Tabs filtráveis + grid de vagas
├── FormSection.tsx       # "Trabalhe conosco"
└── FooterPortal.tsx      # Footer completo
```

---

## Design System do Figma

### Cores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#000000` | Fundo da página |
| `--text-main` | `#F5F6F8` | Títulos e textos principais |
| `--text-dim` | `#C3C7CD` | Subtítulos, descrições |
| `--text-muted` | `#5C636D` | Separadores, elementos secundários |
| `--primary` | `#2C58FD` | Botões primários, links |
| `--accent` | `#00A3F9` | Valores salariais, destaques |
| `--card-bg` | `rgba(44, 88, 253, 0.12)` | Background de cards |
| `--tab-count-bg` | `#171C23` | Badge de contagem nas tabs |

### Tipografia

| Elemento | Font | Weight | Size | Line-height |
|---|---|---|---|---|
| Hero title | Space Grotesk | 700 | 64px | 76.8px |
| Section title | Space Grotesk | 700 | 48px | 57.6px |
| Section subtitle | Space Grotesk | 500 | 24px | 28.8px |
| Card área title | Space Grotesk | 500 | 28px | 33.6px |
| Vaga card title | Space Grotesk | 500 | 20px | 32px |
| Tab label | Space Grotesk | 500 | 24px | 28.8px |
| Navbar item | Manrope | 600 | 14px | 16.8px |
| Hero description | Manrope | 400 | 20px | 28.8px |
| Card description | Inter | 400 | 16px | 24px |
| Button CTA | Manrope | 700 | 18px / 16px | — |
| Form field label | Space Grotesk | 500 | 16px | 19.2px |
| Form placeholder | Manrope | 400 | 16px | 23px |
| Tab count badge | Inter | 700 | 16px | 24px |
| Footer link | Manrope | 600 | 16px | 19.2px |
| Copyright | Manrope | 400 | 12px | 17.28px |

### Efeitos

- **Navbar**: `backdrop-filter: blur(16px)` com fundo `rgba(0,0,0,0.8)`
- **Cards**: border `1px solid rgba(255,255,255,0.05)`, hover: `border-color: rgba(44,88,253,0.3)`
- **Transições**: `all 0.3s ease` em cards e botões

---

## Seções da página (1440px)

```
┌──────────────────────────────────────────────────┐
│ Navbar (80px) · backdrop-filter: blur(16px)      │
│ Logo | Sobre | Soluções | Cases | Carreiras |    │
│ Contato                          [Falar c/ gente] │
├──────────────────────────────────────────────────┤
│ Hero (730px)                                      │
│ "Comece sua melhor jornada com a Usabit"         │
│ Descrição · [Ver vagas] [Cadastrar currículo]    │
│                                        ilustração │
├──────────────────────────────────────────────────┤
│ Áreas (1022px)                                    │
│ "Áreas onde seu talento faz diferença"           │
│ ┌──────────┐ ┌──────────┐                        │
│ │  Design  │ │  Desenv. │                        │
│ ├──────────┤ ├──────────┤                        │
│ │ Marketing│ │  R&P     │                        │
│ └──────────┘ └──────────┘                        │
├──────────────────────────────────────────────────┤
│ Vagas Abertas (1399px)                            │
│ [Todos 12] [Design 4] [Developer 0] [R&P 4] ...  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │ Vaga 1  │ │ Vaga 2  │ │ Vaga 3  │              │
│ ├─────────┤ ├─────────┤ ├─────────┤              │
│ │ Vaga 4  │ │ Vaga 5  │ │ Vaga 6  │              │
│ └─────────┘ └─────────┘ └─────────┘              │
├──────────────────────────────────────────────────┤
│ Formulário (1068px)                               │
│ "Trabalhe conosco"                                │
│ ┌────────────────────────────────────┐            │
│ │ Nome completo                      │            │
│ │ E-mail                             │            │
│ │ Telefone                           │            │
│ │ Link do Portfólio (opcional)       │            │
│ │ [Anexar currículo]                 │            │
│ │ [Enviar currículo]                 │            │
│ └────────────────────────────────────┘            │
├──────────────────────────────────────────────────┤
│ Footer (762px)                                    │
│ "Tem um desafio parecido? Vamos falar!"           │
│ [Conte-nos seu projeto]                           │
│ ──────────────────────────────────────            │
│ Soluções   | A Empresa      | Legal               │
│ UX/Design  | Sobre a Usabit | Privacidade         │
│ Software   | Carreiras      | Termos              │
│ Outsourcing| Cases          |                     │
│ ...        |                |                     │
│ © 2025 Usabit · Todos os direitos reservados      │
└──────────────────────────────────────────────────┘
```

---

## Passo a passo cirúrgico

### Passo 1 — Exportar asset do Figma

```bash
# 1a. Obter URL da ilustração
curl.exe -s -H "X-Figma-Token: ${FIGMA_TOKEN}" \
  "https://api.figma.com/v1/images/ty0Z2zeQy6xzwxfruJXmIF?ids=1323:14366&format=png&scale=2"

# 1b. Fazer download para public/
curl.exe -s -o public/illustrations/hero-illustration.png \
  "<url-retornada-no-passo-1a>"
```

### Passo 2 — Criar `src/pages/vagas/portal/types.ts`

Interfaces: `AreaCard`, `NavbarItem`, `FooterLinkGroup`, `PortalSectionProps`.

### Passo 3 — Criar `src/pages/vagas/portal/data.ts`

Dados estáticos extraídos do Figma: `navbarItems`, `areas`, `tabFilters`, `footerGroups`.

### Passo 4 — Criar `NavbarPortal.tsx`

- `<nav>` fixo no topo, `z-index: 100`
- `backdrop-filter: blur(16px)`, fundo `rgba(0,0,0,0.8)`
- Logo à esquerda (`orgInfo.logo_url` com fallback)
- Itens do menu centralizados (data.navbarItems)
- Botão "Falar com a gente" à direita (ícone WhatsApp + texto)
- Props: `logoUrl: string`, `orgName: string`

### Passo 5 — Criar `HeroSection.tsx`

- `min-height: 730px`, `display: flex`, `align-items: center`
- Lado esquerdo: título (Space Grotesk 700/64px), descrição (Manrope 400/20px), 2 CTAs
- Lado direito: `<img src="/illustrations/hero-illustration.png">`
- CTA "Ver vagas" → scroll suave para seção de vagas
- CTA "Cadastrar currículo" → `navigate(/carreiras/${orgId}/candidatar)`
- Textos fixos do Figma (não do banco)
- Props: `orgId: string`, `onNavigate: (path: string) => void`

### Passo 6 — Criar `AreasSection.tsx`

- `padding: 80px 0`
- Título: "Áreas onde seu talento faz diferença" (Space Grotesk 700/48px)
- Grid 2×2 com 4 cards
- Cada card: ícone + título (Space Grotesk 500/28px)
- Dados de data.areas
- Sem props (dados estáticos)

### Passo 7 — Criar `VagasSection.tsx`

- Título: "Vagas abertas" (Space Grotesk 700/48px)
- Subtítulo: "Venha transformar negócios com tecnologia, estratégia e design."
- Tabs horizontais com ícones + badge de contagem
- Grid 3 colunas de cards de vaga
- Cada card: cargo, regime/local/contrato, faixa salarial (cyan #00A3F9), "Ver mais detalhes"
- Ao clicar no card → navigate(`/v/${hash}`)
- Props: `vagas: Vaga[]`, `activeCategory: string`, `onCategoryChange`, `orgId: string`
- Filtros: `Todos | Design | Developer | R&P | Marketing` (mapear category real da vaga)

### Passo 8 — Criar `FormSection.tsx`

- Título: "Trabalhe conosco" (Space Grotesk 700/48px)
- Descrição: "Cadastre seu currículo e informações e entraremos em contato..."
- Botão "Cadastrar currículo" → `navigate(/carreiras/${orgId}/candidatar)`
- Props: `orgId: string`, `onNavigate: (path: string) => void`

### Passo 9 — Criar `FooterPortal.tsx`

- Seção superior: "Tem um desafio parecido? Vamos falar!" + CTA "Conte-nos seu projeto"
- Seção inferior: 3 colunas (data.footerGroups)
- Copyright: "© 2025 Usabit. Todos os direitos reservados."

### Passo 10 — Reescrever `OrganizationCareerPage.tsx`

Manter toda a lógica (imports, interfaces, useState, useEffect, fetch,
filtros, getContractTypeLabel). Trocar o JSX de retorno para usar os
componentes do portal.

**Manter o SVG decorativo de background (elipses)** — já existe no código
atual e corresponde ao design do Figma.

### Passo 11 — Verificação

```bash
npx tsc --noEmit                    # 0 erros
npx eslint src/pages/vagas/         # 0 erros (warnings pré-existentes ignorados)
npx vite build                      # build com sucesso
```

### Passo 12 — Commit

Mensagem: `feat: redesign public career portal with Figma layout`

---

## Árvore final de arquivos (só o que muda)

```
src/pages/vagas/
├── portal/                          ← NOVO
│   ├── types.ts
│   ├── data.ts
│   ├── NavbarPortal.tsx
│   ├── HeroSection.tsx
│   ├── AreasSection.tsx
│   ├── VagasSection.tsx
│   ├── FormSection.tsx
│   └── FooterPortal.tsx
├── OrganizationCareerPage.tsx       ← MODIFICADO
├── CareerPortalHub.tsx              ← NÃO MEXE
├── SpontaneousApplication.tsx       ← NÃO MEXE
├── PublicJobPage.tsx               ← NÃO MEXE
├── JobApplication.tsx              ← NÃO MEXE
├── Vagas.tsx                       ← NÃO MEXE
├── PoolTalentos.tsx                ← NÃO MEXE
├── PortalPreview.tsx               ← NÃO MEXE
└── VagaForm.tsx                    ← NÃO MEXE

public/illustrations/
└── hero-illustration.png            ← NOVO (exportado do Figma)
```

---

## Análise de risco por passo

| Passo | Risco | Por quê | Mitigação |
|---|---|---|---|
| 1 (export asset) | Mínimo | API REST, só leitura | — |
| 2-9 (criar componentes) | Mínimo | Arquivos novos, não afetam nada | — |
| 10 (modificar página) | Médio | Único passo que altera arquivo existente | Manter toda lógica de estado, só trocar JSX |
| 11 (verificação) | Mínimo | Compilador + linter + build | Executar em ordem, parar se falhar |
| 12 (commit) | Mínimo | Git | Commit atômico, fácil de reverter |
