# Documentação: Integração da API Pública de Vagas (White Label)

Este documento descreve como um site externo (do cliente ou parceiro) pode consumir a listagem de vagas da plataforma em tempo real. A API retorna os dados visuais da Organização e todas as vagas que estejam com o status **"Aberta"** (Publicada).

## 🚀 Como Funciona

A API foi construída como uma **Edge Function** no Supabase e atua via método `GET`.  
Sempre que o site externo fizer a chamada, ele deve fornecer na URL o `orgId` (ID Único da Empresa) que isola e retorna **apenas** as informações daquela empresa específica.

---

## 🧑‍💻 Exemplo de Chamada (cURL)

Faça uma requisição `GET` com o Header de autenticação básica (Anon Key) padrão da plataforma:

```bash
curl -X GET "https://dfsqdfetzcwvmfphljzs.supabase.co/functions/v1/public-jobs?orgId=COLOQUE-O-ID-DA-EMPRESA-AQUI" \
-H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmc3FkZmV0emN3dm1mcGhsanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODUxODYsImV4cCI6MjA2Mzg2MTE4Nn0.qChPcuPmJCfkF7-xrqGP6fOHLIqz7QqzPJRzSHT7Pq8"
```

> **Para testes:** Você pode testar com a empresa `Usabit Teste Validação`, cujo ID é: `fbf6f0f8-d014-42ac-9a9a-bf7c61ade3de`.


---

## 📦 Formato da Resposta (JSON)

Ao fazer o `.json()` do `fetch`, você receberá dois blocos:
1. `orgInfo`: Contém todos os dados visuais da empresa (textos sobre nós, logomarca, cor primária) para montar a Header.
2. `vagas`: Array com todas as vagas abertas disponíveis.

### Exemplo do Payload Retornado:

```json
{
  "orgInfo": {
    "name": "Usabit Teste Validação",
    "logo_url": "https://dfsqdfetzcwvmfphljzs.supabase.co/storage/v1/object/public/logos/...",
    "primary_color": "#3b82f6",
    "font_color": "#0f172a",
    "about_text": "Somos uma empresa de Tecnologia.",
    "page_background_url": ""
  },
  "vagas": [
    {
      "id": "uuid-da-vaga-aqui",
      "title": "Front-end",
      "public_hash": "hash-para-url-da-vaga",
      "has_salary_range": true,
      "salary_min": 3500,
      "salary_max": 5000,
      "contract_type": "pj",
      "work_regime": "full-time",
      "is_pcd": "inclusiva",
      "has_location": true,
      "location": "Rio de Janeiro - RJ",
      "work_model": "remote",
      "category": "Desenvolvimento",
      "company_name": "Nome da Filial Se Existir",
      "created_at": "2026-04-16T10:30:00Z"
    },
    {
      "id": "uuid-vaga-2",
      "title": "Back-End"
      // ... atributos ...
    }
  ]
}
```

## 💡 A Página de Detalhes da Vaga

Ao renderizar a vitrine, muito provavelmente o seu site vai permitir que o candidato clique em uma vaga para ler tudo sobre ela (A Descrição, Responsabilidades, etc). Nestes casos, em vez da API 1, você precisará consultar a API 2: a **API de Detalhes da Vaga**.

---

### 🧐 Como Buscar a Vaga GIGANTE (cURL)

Faça uma requisição `GET` entregando o parâmetro `?hash=` que você pegou da **API 1**.

```bash
curl -X GET "https://dfsqdfetzcwvmfphljzs.supabase.co/functions/v1/public-job-detail?hash=COLOQUE-O-HASH-DA-VAGA-AQUI" \
-H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmc3FkZmV0emN3dm1mcGhsanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODUxODYsImV4cCI6MjA2Mzg2MTE4Nn0.qChPcuPmJCfkF7-xrqGP6fOHLIqz7QqzPJRzSHT7Pq8"
```

### 📦 Formato da Resposta Completa

O JSON de retorno conterá a raiz pura da vaga sob a key `"job"`. Neste retorno vai vir absolutamente tudo:
```json
{
  "job": {
    "id": "uuid",
    "title": "Front-end",
    "public_hash": "abcd-xyz",
    "description": "Texto grande sobre o resumo da vaga corporativa...",
    "responsibilities": "1. Fazer A; 2. Fazer B",
    "requirements": "Saber React",
    "differentials": "Saber NextJS",
    "additional_info": "Vale Refeição R$ 50",
    "vaga_primary_color": "#ff0000",
    "work_regime": "full-time",
    "application_deadline": "2026-05-01"
    // E todos os outros 20 campos!
  }
}
```

## 🎯 Botão "Inscreva-se Agora"
Após você construir todo o layout da vaga com o JSON usando o link 2 acima, você vai botar o link do "Inscreva-se Agora/Candidatar-se" lá em baixo no formulário. A URL de redirecionamento deste botão deve apontar de volta para as origens do software principal: 

`https://url-do-seu-sistema.com/#/v/{public_hash}` ou `https://url-do-seu-sistema.com/#/v/{public_hash}/candidatar`
