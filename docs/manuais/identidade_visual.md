# 🎨 Manual de Identidade Visual — Space Talent

> **Objetivo:** Este documento define os padrões de cores, tipografia e variáveis CSS do projeto.
> Sempre que criar novas páginas, abas ou colunas, consulte este guia para manter a consistência visual.

---

## 1. Tema e Modo de Cores

O projeto suporta dois temas: **Dark (padrão)** e **Light**. A troca de tema é feita via `ThemeContext` e aplica o atributo `data-theme` no `<html>`.

A transição usa a **View Transitions API** com efeito de wipe horizontal.

---

## 2. Paleta de Cores — Modo Dark (padrão)

| Variável CSS            | Valor                       | Uso                                          |
|-------------------------|-----------------------------|----------------------------------------------|
| `--bg-main`             | `#0f111a`                   | Fundo da aplicação                           |
| `--bg-card`             | `#1a1d27`                   | Fundo de cards, modais, painéis              |
| `--bg-sidebar`          | `#0B0D12`                   | Fundo da sidebar                             |
| `--bg-input`            | `#0d0f17`                   | Fundo de inputs e selects                    |
| `--primary`             | `#3b82f6`                   | Cor principal (azul), botões, links ativos   |
| `--primary-rgb`         | `59, 130, 246`              | Versão RGB para `rgba()`                     |
| `--primary-hover`       | `#2563eb`                   | Hover em elementos primários                 |
| `--secondary`           | `#8b5cf6`                   | Cor secundária (roxo), destaques             |
| `--text-main`           | `#ffffff`                   | Texto principal                              |
| `--text-muted`          | `#94a3b8`                   | Texto secundário / subtítulos                |
| `--text-dim`            | `#64748b`                   | Texto terciário / metadados                  |
| `--border`              | `rgba(255, 255, 255, 0.1)`  | Bordas padrão                                |
| `--border-focus`        | `rgba(59, 130, 246, 0.5)`   | Borda em elementos com foco                  |
| `--glass`               | `rgba(26, 29, 39, 0.7)`     | Efeito glassmorphism                         |
| `--glass-border`        | `rgba(255, 255, 255, 0.05)` | Borda do efeito glass                        |
| `--success`             | `#10b981`                   | Verde de sucesso                             |
| `--success-bg`          | `rgba(16, 185, 129, 0.15)`  | Fundo de badges/alertas de sucesso           |
| `--text-error`          | `#ef4444`                   | Vermelho de erro                             |
| `--error-border`        | `rgba(239, 68, 68, 0.25)`   | Borda de elementos com erro                  |
| `--favorite`            | `#fbbf24`                   | Amarelo para favoritos/estrelas              |
| `--favorite-bg`         | `rgba(251, 191, 36, 0.1)`   | Fundo de badge de favorito                   |
| `--primary-light-bg`    | `rgba(59, 130, 246, 0.1)`   | Fundo leve para ícones/badges primários      |
| `--primary-border`      | `rgba(59, 130, 246, 0.2)`   | Borda de elementos com destaque primário     |
| `--primary-text-light`  | `#a5b4fc`                   | Texto azul claro em fundos escuros           |
| `--row-hover`           | `rgba(99, 102, 241, 0.05)`  | Hover em linhas de tabela                    |
| `--sidebar-active`      | `rgba(255, 255, 255, 0.08)` | Fundo do item ativo na sidebar               |
| `--sidebar-active-text` | `#ffffff`                   | Texto do item ativo na sidebar               |

---

## 3. Paleta de Cores — Modo Light

| Variável CSS            | Valor                        |
|-------------------------|------------------------------|
| `--bg-main`             | `#f1f5f9`                    |
| `--bg-card`             | `#ffffff`                    |
| `--bg-sidebar`          | `#ffffff`                    |
| `--bg-input`            | `#ffffff`                    |
| `--primary`             | `#2563eb`                    |
| `--primary-hover`       | `#1d4ed8`                    |
| `--secondary`           | `#7c3aed`                    |
| `--text-main`           | `#0f172a`                    |
| `--text-muted`          | `#334155`                    |
| `--text-dim`            | `#64748b`                    |
| `--border`              | `#e2e8f0`                    |
| `--success`             | `#15803d`                    |
| `--text-error`          | `#dc2626`                    |
| `--sidebar-active`      | `#2563eb`                    |
| `--sidebar-active-text` | `#ffffff`                    |

---

## 4. Tipografia

### Fontes usadas no projeto

| Fonte              | Fonte CSS                                | Uso                                          |
|--------------------|------------------------------------------|----------------------------------------------|
| **Inter**          | `'Inter', system-ui, sans-serif`         | Fonte global do corpo da aplicação           |
| **Space Grotesk**  | `'Space Grotesk', sans-serif`            | Landing page e elementos de destaque         |
| **Gorditas**       | `'Gorditas'`                             | Elementos decorativos específicos            |

### Hierarquia de Texto (recomendada)

| Nível       | Font Size   | Font Weight | Variável de Cor    |
|-------------|-------------|-------------|---------------------|
| Título H1   | `22–24px`   | `700`       | `var(--text-main)`  |
| Título H2   | `18–20px`   | `600`       | `var(--text-main)`  |
| Subtítulo   | `14–15px`   | `500`       | `var(--text-muted)` |
| Corpo       | `13–14px`   | `400`       | `var(--text-main)`  |
| Metadado    | `11–12px`   | `400`       | `var(--text-dim)`   |
| Badge / Tag | `10–11px`   | `700`       | Varia por contexto  |

---

## 5. Gradientes e Acentos (usados internamente)

```css
/* Gradiente principal — botões e destaques */
background: linear-gradient(135deg, #6366f1, #8b5cf6);

/* Gradiente de logo/hero */
background: linear-gradient(135deg, #3b82f6, #8b5cf6, #a78bfa);

/* Gradiente de texto (hero) */
background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

/* Cor de score verde */
#10b981 (score >= 70)
/* Cor de score amarelo */
#f59e0b (score >= 40 e < 70)
/* Cor de score vermelho */
#ef4444 (score < 40)
```

---

## 6. Bordas e Sombras

```css
/* Border radius padrão de cards e modais */
border-radius: 12px;  /* cards pequenos */
border-radius: 16px;  /* cards médios, painéis */
border-radius: 24px;  /* cards grandes, modais */

/* Sombra padrão de card */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

/* Sombra de destaque azul (glow) */
box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
```

---

## 7. Scrollbar Personalizado

A aplicação já possui scrollbar customizado definido globalmente no `index.css`:
- **Largura:** `6px`
- **Cor:** `var(--text-dim)` (hover: `var(--text-muted)`)
- **Fundo:** `var(--bg-main)`

Use a classe `.hide-scrollbar` para ocultar a scrollbar em contêineres com scroll interno.

---

## 8. CSS Utilitários (Classes Globais)

| Classe              | Uso                                               |
|---------------------|---------------------------------------------------|
| `.glass`            | Efeito de vidro com blur sobre o fundo            |
| `.glass-card`       | Card com glassmorphism e bordas arredondadas      |
| `.custom-scrollbar` | Scrollbar customizado em contêineres específicos  |
| `.hide-scrollbar`   | Oculta a scrollbar completamente                  |
