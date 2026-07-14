# 🗂️ Manual de Layout e Grid — Usabit people

> **Objetivo:** Padronizar layouts responsivos do projeto.
> **Mobile-first:** projete pensando primeiro em mobile, depois expanda para tablet e desktop.

---

## 1. Breakpoints

| Token Tailwind | Min-width | Uso |
|---|---|---|
| (default) | 0 | Mobile |
| `sm` | 640px | Mobile grande / tablet pequeno |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop pequeno |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Telas grandes |

---

## 2. Estrutura do App

```
┌─────────────────────────────────┐
│         Header/Nav              │
├──────────┬──────────────────────┤
│          │                      │
│ Sidebar  │   Main Content       │
│ (md+:    │   (max-w-7xl)       │
│  visível)│                      │
│          │                      │
│          │                      │
└──────────┴──────────────────────┘
```

- Sidebar visível apenas a partir de `lg` (1024px)
- Mobile/tablet: usar drawer/menu hambúrguer
- Conteúdo principal: `max-w-7xl mx-auto p-4 md:p-8`

---

## 3. Padrões de Grid

### Cards de estatísticas
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Lista + Detalhe
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <aside className="lg:col-span-1"> {/* Lista */} </aside>
  <main className="lg:col-span-2">  {/* Detalhe */} </main>
</div>
```

### Formulários
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 1 coluna em mobile, 2 em tablet+ */}
</div>
```

---

## 4. Padrões Comuns do Projeto

### Dashboard
- Header fixo no topo (h-16)
- Cards em grid 1/2/4 colunas conforme breakpoint
- Padding consistente: `p-4 md:p-6 lg:p-8`

### Listagens (Vagas, Candidatos)
- Topo: filtros + busca
- Centro: cards em grid 2 colunas (md+)
- Mobile: lista vertical

### Formulários longos
- 1 coluna em mobile
- 2 colunas em tablet+
- Botões alinhados à direita (`justify-end`) em telas grandes

---

## 5. ❌ Não Faça

- ❌ Usar `w-[1280px]` fixo — sempre responsivo
- ❌ Esconder elementos importantes no mobile — adapte o layout
- ❌ Usar `position: absolute` pra layout — distorce mobile
- ❌ Misturar breakpoints (`md:` e `lg:` no mesmo valor)
- ❌ Sidebar fixa em mobile — use drawer

---

## 6. Responsividade

Teste sempre em:
- iPhone SE (375px) — menor mobile comum
- iPad (768px) — tablet
- Desktop 1440px — padrão desktop

Use Chrome DevTools (F12 → modo device) para validar.
