<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/docs/banner-dark.svg">
    <img src="public/docs/banner-light.svg" alt="Usabit people — Recrutamento e Seleção com IA" width="100%">
  </picture>
</p>

<h1 align="center">🚀 Usabit people</h1>

<p align="center">
  <strong>O Futuro do Potencial Humano com Inteligência Artificial.</strong><br>
  Uma plataforma de nível empresarial para Recrutamento e Seleção modernos.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
</p>

---

## 📖 Visão

O **Usabit people** é um ecossistema premium projetado para revolucionar o ciclo de vida do recrutamento. Ao integrar Inteligência Artificial avançada com uma arquitetura cloud de alta performance, capacitamos as equipes de RH a descobrir, analisar e contratar talentos de alto nível com velocidade e precisão sem precedentes.

Nossa missão é eliminar a carga administrativa e fornecer insights comportamentais e técnicos profundos, permitindo que os recrutadores foquem no que realmente importa: **a conexão humana**.

---

## ✨ Principais Funcionalidades

### 🤖 Triagem Inteligente e AI Scoring
- **Ranking Automatizado**: Algoritmos avançados que pontuam candidatos com base na compatibilidade entre currículo e vaga.
- **Filtros Inteligentes**: Busca multidimensional por habilidades, senioridade e localização.

### 📋 Gestão de Pipeline Completa
- **Kanban Visual**: Fluxo de trabalho dinâmico com drag-and-drop para gerenciar candidatos entre as etapas.
- **Fluxo de Candidatura Personalizado**: Conjuntos de perguntas adaptáveis e lógica de formulário inteligente.

### 📊 Analytics em Tempo Real
- **KPIs Estratégicos**: Dashboards de Tempo de Contratação (Time-to-Hire), Diversidade e Inclusão, e Eficácia de Fontes.
- **Insights Preditivos**: Sugestões baseadas em dados para otimização de processos.

### 🔒 Privacidade e Segurança (Proteção de PII)
- **Armazenamento Seguro de Documentos**: Currículos protegidos via buckets privados no Supabase e URLs Assinadas.
- **RLS Granular**: Row Level Security (RLS) garante que os dados sejam acessíveis apenas por recrutadores autorizados.

### 🌐 API de Integração Pública
- **Exposição Externa**: Edge Functions seguras para listar e buscar detalhes de vagas para portais de terceiros.
- **Visibilidade Híbrida**: Suporte para vagas "Invisíveis" — acessíveis apenas via link direto para recrutamento discreto.

---

## 🛠️ Stack Tecnológica

### Ecossistema Frontend
- **React 18**: Arquitetura de UI baseada em componentes.
- **TypeScript**: Segurança de tipos em todo o projeto.
- **Vite**: Ferramenta de build e servidor de desenvolvimento ultra-rápido.
- **Tailwind CSS**: Estilização utilitária para uma interface premium e responsiva.
- **Lucide**: Iconografia moderna e minimalista.

### Infraestrutura Backend (BaaS)
- **Supabase / PostgreSQL**: Banco de dados relacional escalável com RLS avançado.
- **Edge Functions**: Funções serverless baseadas em Deno para interações de API seguras.
- **PostgREST**: Camada de API RESTful instantânea e segura.
- **Supabase Storage**: Gestão segura de documentos dos candidatos.

---

## 🚀 Começando

### 1. Pré-requisitos
- Node.js (v18 ou superior)
- Conta e projeto no Supabase

### 2. Instalação
```bash
# Clone o repositório
git clone https://github.com/usabit/rh-ia-v2.git

# Instale as dependências
cd rh-ia-v2
npm install
```

### 3. Configuração de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua_url_do_projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 4. Servidor de Desenvolvimento
```bash
npm run dev
```

---

## 📁 Arquitetura do Projeto

```text

├── docs/                # Documentação técnica e políticas de segurança
├── src/
│   ├── core/           # Lógica de negócio, serviços (Supabase, API)
│   ├── layouts/        # Componentes de layout global e Design System
│   ├── pages/          # Views baseadas em funcionalidades
│   └── common/         # Componentes de UI reutilizáveis
├── supabase/
│   ├── functions/      # Edge Functions serverless seguras
│   └── migrations/     # Esquema de banco de dados versionado
└── README.md           # Este documento
```

---

## 🔐 Padrões de Segurança

Este projeto adere a protocolos rígidos de segurança para garantir a proteção dos dados dos candidatos (pronto para LGPD):
- Todos os dados sensíveis (PII) são protegidos por **Row Level Security (RLS)** do PostgreSQL.
- APIs externas são filtradas e servidas via **Supabase Edge Functions**.
- O acesso a arquivos é estritamente controlado via **URLs Assinadas (Signed URLs)**.

---

<p align="center">
  <strong>Desenvolvido com Precisão e Paixão pela Usabit ❤️</strong><br>
  © 2026 Usabit. Todos os direitos reservados.
</p>