# 🚫 Padrões Proibidos — Design Usabit people

> **Objetivo:** Documentar explicitamente o que NÃO fazer no projeto.
> O `@design-planner` consulta este arquivo antes de propor qualquer redesign.
> O `@static-critic` usa isto como checklist ao revisar código.

---

## 1. ❌ Cores e Tokens

| ❌ Não faça | ✅ Faça |
|---|---|
| `bg-[#3b82f6]` (hex hardcoded) | `bg-primary` ou `bg-[var(--primary)]` |
| `text-[#fff]` | `text-white` ou `text-text-main` |
| `border-[#1f2332]` | `border-border` ou `border-[var(--border)]` |
| Misturar `#0f111a` e `#0F111A` | Use minúsculas para tudo |
| Criar nova cor fora dos tokens | Usar token existente ou pedir criação no `index.css` |

---

## 2. ❌ Gradientes

| ❌ Não faça | ✅ Faça |
|---|---|
| `bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]` | Usar `--gradient-primary` (já existe em `--gradient-primary`) |
| Gradiente aleatório sem propósito | Gradiente apenas em hero/CTA de marketing |
| `bg-gradient-to-tr from-purple to-pink` | Roxo com gradiente virou genérico — evitar |

**Gradientes só são permitidos em:**
- Landing pages (Hero section)
- Loading screens com propósito
- Botões CTA primários (padrão já existe)

---

## 3. ❌ Cards

| ❌ Não faça | ✅ Faça |
|---|---|
| 6+ cards iguais na mesma tela | Usar lista compacta ou mistura (cards + tabela) |
| `<Card>` em todo lugar | Usar seções com `bg-card` + padding quando apropriado |
| `border-2 border-primary rounded-2xl p-6` em série | Variar densidade: alguns sem border, alguns com shadow |
| Card dentro de card | Evitar hierarquia visual dupla |

**Quando usar Card:**
- Apresentar entidade distinta (candidato, vaga)
- Precisar de hierarquia visual clara

**Quando NÃO usar Card:**
- Listar itens muitos (usar `<Row>` ou tabela)
- Dentro de modal (já tem fundo próprio)

---

## 4. ❌ Sombras

| ❌ Não faça | ✅ Faça |
|---|---|
| `shadow-2xl` exagerado | `shadow-sm` ou `shadow` |
| `shadow-[0_0_50px_rgba(...)]` custom | Usar tokens de shadow do Tailwind |
| Sombras em todos os elementos | Sombras só em elementos flutuantes (modal, dropdown) |

---

## 5. ❌ Botões

| ❌ Não faça | ✅ Faça |
|---|---|
| Texto genérico: "Clique aqui", "OK", "Submit" | Texto específico: "Adicionar candidato", "Salvar vaga" |
| 5+ botões primários na mesma tela | Máximo 2 botões primários por seção |
| Botão sem loading state | Sempre ter `disabled` + spinner quando assíncrono |
| Botão primário sem ícone de ação | Ícone consistente (`lucide-react`) |

---

## 6. ❌ Tipografia

| ❌ Não faça | ✅ Faça |
|---|---|
| `text-[15px]` arbitrário | Usar `text-sm`, `text-base`, `text-lg` |
| Misturar 4+ pesos de fonte | Limitar a 3 (regular, medium, bold) |
| Texto todo em UPPERCASE | Reservar para status labels |
| `font-bold` em parágrafos | Usar em títulos curtos |

---

## 7. ❌ Espaçamentos

| ❌ Não faça | ✅ Faça |
|---|---|
| `p-[17px]`, `m-[13px]` | Usar escala 4px (ver `spacing.md`) |
| `gap-y-[7px]` fracionário | Usar tokens inteiros |
| Misturar `p-4` e `p-5` no mesmo card | Escolher 1 e manter |

---

## 8. ❌ Layout / Responsive

| ❌ Não faça | ✅ Faça |
|---|---|
| `w-[1280px]` fixo | Usar breakpoints `md:`, `lg:` |
| Sidebar fixa em mobile | Usar drawer/hambúrguer |
| Esconder CTAs importantes em mobile | Adaptar, não esconder |
| `position: absolute` para layout | Usar flex/grid |

---

## 9. ❌ Aparência Genérica "SaaS"

Evitar combinações clichês:
- Roxo `#8b5cf6` com gradiente azul → "Stripe genérico"
- 4 cards lado a lado com mesmo tamanho → "Dashboard template"
- Hero com gradiente + 3 cards de features → "Landing page template"
- Botões arredondados `rounded-full` em tudo → "AI app genérico"

**Em vez disso:**
- Direcionar estilo **editorial/sóbrio** quando possível
- Preferir **hierarquia por tipografia** em vez de bordas
- Usar **espaço negativo** como elemento de design
- Limitar cores: 1 primária + 1 secundária + neutros

---

## 10. ❌ Estados Faltando

Toda interação precisa ter:

| Estado | Exemplo |
|---|---|
| Loading | `Skeleton` ou spinner |
| Vazio | Mensagem + ícone + CTA ("Nenhum candidato ainda") |
| Erro | Mensagem clara + botão "Tentar novamente" |
| Sucesso | Toast ou feedback inline |
| Disabled | Visual claramente desabilitado |

**Não aceite**: nenhum desses 5 estados em branco.

---

## 11. ❌ Acessibilidade (a11y)

| ❌ Não faça | ✅ Faça |
|---|---|
| `<div onClick={...}>` sem `role="button"` | Usar `<button>` |
| Imagens sem `alt` | Sempre descrever imagem |
| Cor como único indicador | Adicionar ícone ou texto |
| `tabindex` manual | Manter ordem natural do DOM |
| Texto < 14px em mobile | Mínimo `text-sm` |

---

## 12. Checklist Rápido do `@static-critic`

Antes de aprovar código visual, validar:

- [ ] Zero cores hardcoded (todas via tokens)
- [ ] Zero valores arbitrários em spacing (`p-[Xpx]`)
- [ ] Botões com texto específico, não genérico
- [ ] Cada interação tem loading/empty/error/success
- [ ] Responsivo testado em 3+ breakpoints
- [ ] Contraste mínimo WCAG AA (4.5:1 texto normal)
- [ ] Sem `rounded-full` em tudo
- [ ] Sem gradiente aleatório
- [ ] Sem mais de 6 cards iguais
- [ ] Sem `position: absolute` para layout
