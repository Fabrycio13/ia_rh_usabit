# 📐 Manual de Espaçamento — Usabit people

> **Objetivo:** Padronizar todos os espaçamentos do projeto em uma escala única de 4px.
> Sempre que precisar de padding, margin, gap ou qualquer espaçamento, use os tokens desta escala.
> **Evite valores arbitrários** como `p-3.5`, `m-[17px]`, `gap-y-[13px]`.

---

## 1. Escala Base (Tailwind v4 está em px por padrão)

Base: **4px**

| Token Tailwind | px | Uso |
|---|---|---|
| `0` | 0 | Resetar |
| `1` | 4px | Aperto mínimo (badge, ícone pequeno) |
| `2` | 8px | Entre elementos muito próximos |
| `3` | 12px | Entre label e input |
| `4` | 16px | Padrão (padding de botão, gap entre cards) |
| `5` | 20px | Padding de cards |
| `6` | 24px | Padding de seções |
| `8` | 32px | Entre seções |
| `10` | 40px | Separação grande |
| `12` | 48px | Margem de página |
| `16` | 64px | Espaçamento hero/landing |
| `20` | 80px | Separação extra grande |

---

## 2. Padrões Recomendados

| Contexto | Token | Exemplo |
|---|---|---|
| Padding de botão | `px-4 py-2` | Botão padrão |
| Padding de input | `px-3 py-2` | Input médio |
| Padding de card | `p-4` ou `p-5` | Card pequeno/médio |
| Padding de modal | `p-6` | Modal padrão |
| Gap entre botões | `gap-2` | Toolbar |
| Gap entre cards | `gap-4` | Grid 2 colunas |
| Gap entre seções | `space-y-8` | Página |
| Margin de página | `p-8 md:p-12` | Página inteira |

---

## 3. ❌ Não Faça

- ❌ `p-[17px]` — valor arbitrário
- ❌ `m-[13px]` — fora da escala
- ❌ `gap-y-[7px]` — fracionário
- ❌ `p-3.5` — exceto se for 14px intencional
- ❌ Misturar `p-4` e `p-5` no mesmo card

---

## 4. Por que 4px?

- Alinhamento com resoluções comuns
- Suporta telas pequenas sem quebrar
- Compatível com Figma/Design System padrão
- Tailwind já usa essa escala por padrão

---

## 5. Tokens CSS disponíveis

Para espaçamentos que precisam ser reutilizáveis em CSS puro:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

Use em componentes específicos quando precisar manter consistência sem repetir Tailwind.
