# 🧩 Manual de Componentes e Padrões — Space Talent

> **Objetivo:** Guia de como usar e criar componentes no projeto, mantendo a consistência visual e de código.
> Consulte este documento antes de criar novas páginas, abas ou colunas.

---

## 1. Estrutura de Pastas do Projeto

```
src/
├── core/                     # Infraestrutura central
│   ├── config/               # Configurações (ex: aiPrompt)
│   ├── contexts/             # Contextos globais (Theme, User, Analysis, Lang)
│   └── services/             # Serviços externos (supabase, logger, cvAnalyzer, aiTools)
│
├── common/                   # Componentes reutilizáveis
│   └── components/
│       └── ui/               # Componentes base (Button, Card, Input, Modal)
│
├── features/                 # Módulos de funcionalidades específicas
│   └── analysis/             # Ex: CandidatePanel, CandidatePanelUtils
│
├── layouts/                  # Layouts principais
│   ├── Sidebar.tsx           # Barra lateral de navegação
│   ├── DashboardLayout.tsx   # Layout padrão das páginas internas
│   └── ChatWidget.tsx        # Widget de chat flutuante
│
├── pages/                    # Páginas organizadas por domínio
│   ├── auth/                 # Login
│   ├── marketing/            # LandingPage
│   ├── dashboard/            # Dashboard, AdminDashboard, AdminLogs
│   ├── analysis/             # Analises, AnaliseNova
│   ├── candidates/           # CandidateBank, Pipeline
│   ├── settings/             # Configuracoes
│   └── support/              # Ajuda, Chat
│
└── types/                    # Definições de tipos TypeScript globais
```

---

## 2. Padrão de Imports

Sempre use **caminhos relativos baseados na posição do arquivo** apontando para `core/`:

```tsx
// De uma página (src/pages/dashboard/)
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { useTheme } from '../../core/contexts/ThemeContext';
import { logActivity } from '../../core/services/logger';
import { useAnalysis } from '../../core/contexts/AnalysisContext';

// De um layout (src/layouts/)
import { supabase } from '../core/services/supabase';
import { useUser } from '../core/contexts/UserContext';

// Do core (src/core/contexts/)
import { supabase } from '../services/supabase';
```

---

## 3. Componentes Base (`src/common/components/ui/`)

### 3.1 Button

Arquivo: `src/common/components/ui/Button.tsx`

```tsx
import { Button } from '../../common/components/ui/Button';

// Variantes disponíveis:
<Button variant="primary">Primário</Button>      // Azul com glow
<Button variant="secondary">Secundário</Button>  // Escuro com borda
<Button variant="danger">Perigo</Button>         // Vermelho
<Button variant="ghost">Fantasma</Button>        // Transparente

// Tamanhos:
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>   // Default
<Button size="lg">Grande</Button>

// Loading state:
<Button isLoading>Carregando...</Button>
```

### 3.2 Card

Arquivo: `src/common/components/ui/Card.tsx`

```tsx
import { Card } from '../../common/components/ui/Card';

<Card>
  Conteúdo do card
</Card>
// Renderiza com: bg #1a1d27, borda rgba(255,255,255,0.1), rounded-xl, p-6, shadow-xl
```

### 3.3 Input e Modal

```tsx
import { Input } from '../../common/components/ui/Input';
import { Modal } from '../../common/components/ui/Modal';
```

---

## 4. Padrão de Card (caso precise criar na mão com inline styles)

Use sempre as variáveis CSS para garantir suporte ao tema claro/escuro:

```tsx
<div style={{
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
}}>
  {/* Conteúdo */}
</div>
```

---

## 5. Padrão de Página

Toda nova página deve:
1. Ser criada na pasta de domínio correta dentro de `src/pages/`
2. Exportar o componente como **named export** (ex: `export const MinhaPage = ...`)
3. Ser registrada no roteador em `src/App.tsx`
4. Usar as variáveis CSS do tema (não usar cores fixas como `#fff` ou `#000`)

### Estrutura base de uma página:

```tsx
import { useState } from 'react';
import { useUser } from '../../core/contexts/UserContext';
import { supabase } from '../../core/services/supabase';

export const MinhaPagina = () => {
  const { profile } = useUser();

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Título da Página
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '4px' }}>
          Descrição breve da página.
        </p>
      </div>

      {/* Conteúdo principal */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        {/* Aqui vai o conteúdo */}
      </div>
    </div>
  );
};
```

---

## 6. Padrão de Tabelas

```tsx
<div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
    <thead>
      <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
        <th style={{ padding: '16px 24px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Coluna
        </th>
      </tr>
    </thead>
    <tbody>
      {items.map(item => (
        <tr
          key={item.id}
          style={{ borderBottom: '1px solid var(--border)', fontSize: '13px', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <td style={{ padding: '16px 24px', color: 'var(--text-main)' }}>
            {item.valor}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 7. Padrão de Badges e Tags

```tsx
{/* Badge de status — sucesso */}
<span style={{
  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
  background: 'var(--success-bg)', color: 'var(--success)',
  border: '1px solid rgba(16, 185, 129, 0.2)'
}}>Ativo</span>

{/* Badge de score (dinâmico) */}
<span style={{
  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
  background: score >= 70 ? 'rgba(16, 185, 129, 0.15)' : score >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
  color: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
}}>
  {score}
</span>
```

---

## 8. Padrão de Ícones

O projeto usa a biblioteca **Lucide React**. Sempre importe os ícones de `lucide-react`:

```tsx
import { Users, Activity, LayoutGrid, Settings } from 'lucide-react';

// Tamanho padrão para ícones em botões/labels
<Users size={16} />

// Tamanho em cards de métricas
<Activity size={20} />

// Ícones decorativos em headers de seção
<LayoutGrid size={18} style={{ color: 'var(--primary)' }} />
```

---

## 9. Contextos Disponíveis

| Contexto          | Hook             | O que fornece                              |
|-------------------|------------------|--------------------------------------------|
| `UserContext`     | `useUser()`      | `profile` (dados do usuário logado)        |
| `ThemeContext`    | `useTheme()`     | `theme`, `toggleTheme()`                   |
| `AnalysisContext` | `useAnalysis()`  | Estado e ações de análise de currículos    |
| `LangContext`     | `useLang()`      | Tradução e idioma da interface             |

---

## 11. Padrão de Filtros e Barras de Pesquisa

Para manter a consistência em todas as listagens (Banco de Candidatos, Análises, Logs), siga este padrão de cores e estrutura:

### 11.1 Container de Filtros (Sub-barra)
Se os filtros estiverem em uma barra dedicada abaixo do cabeçalho:
- **Background:** `var(--bg-main)` (mais escuro, igual ao fundo da página)
- **Borda:** `1px solid var(--border)`
- **Border Radius:** `12px`
- **Padding:** `14px 18px`

### 11.2 Inputs e Selects dentro da Barra
- **Background:** `var(--bg-card)` (mais claro, para dar contraste de profundidade)
- **Labels:** Use `var(--text-dim)` com `fontSize: 11px` ou `12px`.

```tsx
<div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Filtrar por:</span>
  <input style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }} />
</div>
```

---

## 12. Regras Gerais

1. **Nunca usar cores fixas** como `#fff` ou `#000` nos estilos do dashboard. Use sempre `var(--text-main)`, `var(--bg-card)`, etc.
2. **Evitar duplicar lógica** — se precisar de um utilitário de data/string, crie em `src/core/services/` ou `src/common/`.
3. **Manter exports nomeados** — não usar `export default` nos componentes de página.
4. **Seguir a estrutura de pastas** — novos recursos vão em `src/features/`, novas páginas em `src/pages/<domínio>/`.
5. **Testar os dois temas** — toda nova aba deve funcionar corretamente tanto no modo dark quanto no light.
