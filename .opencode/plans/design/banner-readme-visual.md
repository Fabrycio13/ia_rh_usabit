# Plano — Banner do README (Usabit people)

## Objetivo

Criar um banner PNG de capa para o `README.md`, usando a logo oficial da Usabit people, que:
- Reforce a identidade visual do projeto
- Seja legível em qualquer tema do GitHub (light/dark)
- Comunique imediatamente "Plataforma de recrutamento com IA"
- Não dependa de gradientes chamativos ou SaaS-genéricos

## Problemas Encontrados

1. **`public/docs/banner.png` foi removido** (era da marca antiga Space Talent — feito em commit anterior).
2. **`README.md` atualmente NÃO tem banner visual** — só tem título `<h1>` e badges.
3. **Logos existentes em `public/logos/`**:
   - `usabit-people-logo.png` (4305B, 240x40 viewBox) — formato horizontal, ideal pra banner
   - `usabit-people-logo-dark.png` (4351B) — versão otimizada pra fundo escuro
   - `usabit-people-logo-animated.svg` (3972B) — versão animada, NÃO usar em banner estático
4. **Cores primárias do projeto** (auto-carregadas em `opencode.json`):
   - `--color-primary: #3b82f6` (azul, botões e CTA)
   - `--color-secondary: #8b5cf6` (roxo, destaques)
   - `--color-background-main: #0f111a` (dark mode)
   - Modo light tem fundo claro com `#f8fafc`

## Direção Visual

**Estilo escolhido — SOPHISTICATED EDITORIAL:**

- **Tipografia forte** — wordmark oficial da logo no centro/destaque
- **Espaço negativo generoso** — banner respira, sem lotar elementos
- **Fundo em gradiente sutil** — apenas para separar visualmente do white space do GitHub
  - Gradiente de `--color-primary` (#3b82f6) → `#1e40af` (azul mais escuro, mesmo hue)
  - Ângulo: 135° (diagonal suave)
- **Texto curto e direto** — máximo 1 frase tagline
- **Ícone minimalista** (opcional) — silhueta de pessoa + sparkles IA, vetorial

**❌ Evitar (lista de forbidden-patterns.md):**

- Gradiente arco-íris ou roxo/azul genérico (`from-purple-500 to-pink-500`)
- Vários cards/seções empilhadas no banner
- Texto longo (parágrafo) — banners devem ter 1-2 linhas no máx
- Sombra excessiva na logo
- Tipografia decorativa que não combina com a wordmark

## Hierarquia de Informação

1. **Logo Usabit people** (240x40 ou maior, centralizada) — foco principal
2. **Tagline** (1 linha) — "Recrutamento e Seleção com IA"
3. **Espaço negativo** — bordas largas (pelo menos 80px top/bottom em 1280px de largura)

## Componentes / Arquivos a Criar

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `public/docs/banner-light.png` | **1280x320** (~4:1) | Logo centralizada + tagline, fundo `#f8fafc` → `#e2e8f0` |
| `public/docs/banner-dark.png` | **1280x320** (~4:1) | Logo centralizada + tagline, fundo gradiente `#1e40af` → `#3b82f6` |

**Por que 1280x320:**
- GitHub renderiza README em ~768-1024px de largura visual
- Aspect ratio 4:1 é suficiente pra leitura sem ficar comprido
- 320px de altura dá margem visual sem dominar a página
- Boa performance (< 50KB por banner usando PNG otimizado)

## Tokens Necessários

Nenhum novo token CSS. Usar:

- `--color-primary` (`#3b82f6`)
- `#1e40af` (azul escuro, variação de primary)
- `#f8fafc` (claro, padrão light mode)
- `#e2e8f0` (cinza claro, variação de fundo light)

Se algum designer quiser criar `--color-banner-gradient` no `src/index.css` depois, documentar aqui:

```css
--color-banner-from: #1e40af;  /* light slope primary */
--color-banner-to: #3b82f6;    /* bright primary */
```

## Tipografia

| Elemento | Estilo | Token Tailwind equivalente |
|---|---|---|
| Logo | Wordmark SVG oficial | `usabit-people-logo-dark.png` |
| Tagline | Sans-serif, medium weight | `text-base font-medium` |
| Tagline cor (dark) | Branco com 80% opacity | `text-white/80` |
| Tagline cor (light) | Cinza escuro | `text-gray-700` |

Sugestão visual da tagline:
- Dark: "**Recrutamento e Seleção com IA**" em `text-white/90`
- Light: "**Recrutamento e Seleção com IA**" em `#475569`

## Espaçamento / Layout

```
┌──────────────────────────────────────────────┐
│              (80px padding top)              │
│                                              │
│           [LOGO USABIT PEOPLE]               │
│              (32px gap)                      │
│     "Recrutamento e Seleção com IA"          │
│                                              │
│              (80px padding bottom)           │
└──────────────────────────────────────────────┘
```

- **Logo**: centralizada horizontalmente, tamanho aproximado 200x32 (mantém proporção)
- **Tagline**: centrada, abaixo da logo
- **Padding**: 80px top/bottom, 80px left/right (não colar nas bordas)
- **Largura**: 1280px / Altura: 320px

## Estados Obrigatórios

Banners estáticos não têm estados interativos, mas validar:
- [x] **Light mode**: visível e legível quando GitHub está em light
- [x] **Dark mode**: visível e legível quando GitHub está em dark
- [x] **Mobile** (README em mobile): largura fluida, altura proporcional
- [x] **Markdown preview**: ambos banners têm colar `<img>` no README

## Responsividade

GitHub renderiza o README em ~768px de largura visual em desktop, e ~360px em mobile. O banner:
- **Desktop**: renderiza em escala natural (até 768px de largura)
- **Mobile**: renderiza em ~340px — altura fica ~85px (proporcional)
- Não precisa de `<picture>` com `srcset` — um único tamanho já funciona para ambos

**Recomendações de uso:**

```html
<!-- Banner dark (preferencial, GitHub dark mode) -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/docs/banner-dark.png">
  <img src="public/docs/banner-light.png" alt="Usabit people — Recrutamento e Seleção com IA">
</picture>
```

Isso adapta automaticamente pro tema.

## Critérios de Aceitação

- [ ] Banner PNG salvo em `public/docs/banner-dark.png` (1280x320)
- [ ] Banner PNG salvo em `public/docs/banner-light.png` (1280x320)
- [ ] Ambos com peso < 30KB (otimização PNG recomendada)
- [ ] Logo Usabit people oficial no centro (não Space Talent)
- [ ] Tagline "Recrutamento e Seleção com IA" visível e legível
- [ ] Usar cores tokens do design system (`#3b82f6` + variações), não cores aleatórias
- [ ] Zero texto de espaço-talent, espaço, talent ou menção à marca antiga
- [ ] **README.md atualizado** com `<picture>` apontando pros 2 banners

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/docs/banner-dark.png">
    <img src="public/docs/banner-light.png" alt="Usabit people — Recrutamento e Seleção com IA" width="100%">
  </picture>
</p>
```

## Riscos Visuais

| Risco | Mitigação |
|---|---|
| Logo com pouca legibilidade no fundo claro | Usar `usabit-people-logo.png` (variante clara) |
| Logo brilhante perdendo contraste no fundo escuro | Usar `usabit-people-logo-dark.png` ou aumentar brilho |
| Tagline muito pequena (mobile) | Garantir `text-base` mínimo (16px) |
| Banner pesado (> 100KB) | Usar PNG-8 indexed color, ou exportar JPG @ 90% |
| Esquecer de atualizar README | Passo do critério de aceitação |

## Estimativa de Complexidade

**🟢 Baixa** — 2 arquivos PNG para gerar + 1 linha no README.

Quem executa: `@designer` ou `@frontend` (qualquer um pode, é só colocar PNGs e atualizar o `<picture>` no README).

## Próximos Passos (após aprovação)

1. **Gerar `public/docs/banner-light.png`** e `public/docs/banner-dark.png` (imagens finais via ferramenta gráfica ou HTML+Screenshot)
2. **Atualizar `README.md`** com o bloco `<picture>` acima
3. **Commitar + push** com mensagem `feat(design): add README banner using Usabit people logo (light + dark variants)`
4. **Validar** que aparece em `https://github.com/usabit/rh-ia-v2`

## Referências

- Cores: `docs/design/identidade_visual.md`
- Tokens: `src/index.css` → `--color-*`
- Logos oficiais: `public/logos/usabit-people-logo*.{png,svg}`
- README: `README.md`
- Padrões: `docs/design/forbidden-patterns.md`
