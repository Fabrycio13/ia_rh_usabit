# ia-rh-usabit - AI-Powered HR Recruitment Platform

## Project Overview

**ia-rh-usabit** (also known as **ia-rh**) is a modern, AI-powered recruitment and HR management platform built with React, TypeScript, and Vite. The application leverages OpenAI's GPT-4o-mini for intelligent CV analysis and scoring, Supabase for backend services (authentication, database, storage), and provides a comprehensive suite of tools for recruitment processes, candidate management, and HR analytics.

### Core Features

- **AI-Powered CV Analysis**: Automated resume parsing and scoring using OpenAI Vision and text analysis
- **Candidate Bank**: Centralized database of candidates with deduplication and history tracking
- **Job/Analysis Management**: Create and track recruitment processes with detailed analytics
- **Dashboard**: Real-time metrics and insights on recruitment pipelines
- **Multilingual Support**: Portuguese (default) and English interface
- **AI HR Assistant**: Integrated chatbot with access to user's recruitment data via Supabase tools

### Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19.2, TypeScript 5.9, Vite 7.3 |
| **Styling** | Tailwind CSS 4.2, Lucide React icons |
| **Backend** | Supabase (Auth, Database, Storage) |
| **AI/ML** | OpenAI GPT-4o-mini, Google Generative AI |
| **Routing** | React Router DOM 7.13 |
| **Charts** | Chart.js, Recharts |
| **File Processing** | pdfjs-dist (PDF), XLSX (Excel) |
| **Notifications** | react-hot-toast |
| **Markdown** | react-markdown |

## Project Structure

```
src/
├── App.tsx                 # Main app component with routing
├── main.tsx                # Entry point
├── index.css               # Global styles (Tailwind)
├── components/
│   ├── analysis/           # CV analysis components
│   ├── layout/             # Layout components (DashboardLayout, etc.)
│   └── ui/                 # Reusable UI components
├── config/
│   └── aiPrompt.ts         # AI system prompt for HR assistant
├── contexts/
│   ├── AnalysisContext.tsx # CV analysis state management
│   ├── LangContext.tsx     # i18n/language context
│   └── UserContext.tsx     # User authentication state
├── lib/
│   ├── aiTools.ts          # Supabase tool definitions for AI assistant
│   ├── cvAnalyzer.ts       # CV parsing and scoring logic (OpenAI)
│   └── supabase.ts         # Supabase client initialization
└── pages/
    ├── Login.tsx           # Authentication page
    ├── Dashboard.tsx       # Main dashboard
    ├── Analises.tsx        # Analysis/job listings
    ├── AnaliseNova.tsx     # New CV analysis upload
    ├── CandidateBank.tsx   # Candidate database
    ├── Configuracoes.tsx   # Settings page
    └── Ajuda.tsx           # Help page
```

## Building and Running

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm or yarn
- Supabase project credentials
- OpenAI API key

### Environment Variables

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Development

```bash
# Install dependencies
npm install

# Start development server (localhost:5173)
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Run ESLint
npm run lint
```

## Key Architecture Concepts

### CV Analysis Pipeline

1. **File Upload**: Users upload PDF or Excel files via `AnaliseNova.tsx`
2. **Text Extraction**: `cvAnalyzer.ts` extracts text from PDFs (or uses Vision API for image-based PDFs)
3. **AI Scoring**: OpenAI GPT-4o-mini analyzes CVs against job descriptions using a structured prompt
4. **Progressive State Updates**: Results are added to React state incrementally via `AnalysisContext`
5. **Database Persistence**: Each candidate is saved to Supabase with deduplication logic (email, name+phone matching)
6. **History Tracking**: Candidate analyses are stored in a `history` array within the `analysis` field

### Scoring Algorithm

The AI evaluates candidates on a 0-100 scale:

| Dimension | Weight | Max Points |
|-----------|--------|------------|
| Skills | 50% | 50 |
| Experience | 35% | 35 |
| Education | 15% | 15 |
| **Red Flags** | **Penalties** | **-3 to -100** |

**Classification**:
- 🟢 **FORTE**: 70-100
- 🟡 **MÉDIO**: 40-69
- 🔴 **NÃO ADERENTE**: 0-39

### Database Schema (Supabase)

Key tables:
- `jobs`: Recruitment processes/analyses
- `candidates`: Candidate master data with analysis history
- `job_candidates`: Junction table linking candidates to jobs with scores
- `resume_uploads`: File upload metadata
- `profiles`: User profile information

### AI HR Assistant

The embedded AI assistant (`aiPrompt.ts`) has access to 4 Supabase tools:
- `list_jobs`: List user's job postings
- `search_candidates`: Search candidates by name, location, or job
- `get_candidate_details`: Get full candidate profile
- `get_dashboard_stats`: Retrieve dashboard metrics

## Development Conventions

### TypeScript
- Strict mode enabled via `tsconfig.json`
- Separate configs for app (`tsconfig.app.json`) and Node/tooling (`tsconfig.node.json`)

### ESLint
- ESLint 9.x with flat config
- React Hooks and React Refresh plugins enabled
- Type-aware lint rules available (see README.md for setup)

### Styling
- Tailwind CSS 4.x with Vite plugin
- Utility-first approach with custom design tokens
- Dark theme by default (`bg-[#0f111a]`)

### State Management
- React Context API for global state (User, Language, Analysis)
- Local state with `useState` for component-specific data
- Persistence via `localStorage` for analysis state recovery

### File Naming
- PascalCase for React components (`.tsx`)
- camelCase for utilities and config files
- Descriptive names reflecting domain (e.g., `cvAnalyzer.ts`, `aiTools.ts`)

## Important Notes

### Security
- All Supabase queries are scoped to `user_id` for multi-tenant isolation
- AI assistant tools receive `userId` parameter automatically from session context
- Sensitive data (salaries, CPF, addresses) should not be stored or displayed

### Known Patterns
- **Deduplication Logic**: Candidates are matched by email → name+phone → strict name match
- **Progressive UI**: Analysis results appear incrementally as each CV is processed
- **History Architecture**: Each candidate's `analysis` field contains current data + `history` array for all past analyses

### Localization
- Default language: Portuguese (Brazil)
- Language preference persisted in `localStorage` as `app_lang`
- Translation keys defined in `LangContext.tsx`
