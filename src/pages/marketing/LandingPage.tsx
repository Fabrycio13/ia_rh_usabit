import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Inbox, Handshake, ChevronDown
} from 'lucide-react';
import { UsabitPeopleLogo } from '../../components/UsabitPeopleLogo';
// Fake avatar initials → use a color avatar service
const avatar = (name: string, bg: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=64&bold=true&font-size=0.4`;

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const howItWorks = [
    { step: '01', icon: FileText, title: 'Crie e Publique Vagas', desc: 'Estruturamos as suas oportunidades em descrições claras e completas, prontas para serem publicadas no portal de carreiras com a identidade visual da sua empresa, em poucos minutos.' },
    { step: '02', icon: Inbox, title: 'Centralize Candidaturas', desc: 'Reunimos todas as inscrições em um único ambiente seguro, com importação em lote de currículos em PDF e organização automática por vaga, status e período.' },
    { step: '03', icon: Handshake, title: 'Avalie em Parceria', desc: 'A IA faz uma pré-análise criteriosa de cada perfil e devolve uma leitura objetiva. A decisão final continua sendo sua, com o apoio do time de RH e dos gestores de área.' },
  ];

  const features = [
    { title: 'Página de carreiras com a sua marca', desc: 'Crie um portal de vagas com o seu logotipo, cores e identidade visual. Os candidatos navegam e se inscrevem em um ambiente totalmente seu, sem nenhuma referência à plataforma.' },
    { title: 'Cada pessoa vê apenas o que deve ver', desc: 'O time de RH cuida do processo geral, gestores de área acompanham apenas os candidatos das vagas do seu departamento e convidados têm acessos pontuais. Tudo controlado por níveis de permissão automáticos.' },
    { title: 'Acompanhe cada candidato em um painel visual', desc: 'Arraste e solte as candidaturas entre as etapas do processo, registre notas e comentários com a sua equipe, e mantenha todo o histórico organizado em um só lugar.' },
    { title: 'Análise automática de currículos em segundos', desc: 'A IA lê cada PDF recebido e devolve um resumo com os pontos fortes, os pontos de atenção, a experiência relevante e uma nota de compatibilidade com a vaga — sem você precisar abrir arquivo por arquivo.' },
    { title: 'Todos os currículos em um só lugar', desc: 'Os candidatos que se inscrevem nas suas vagas ficam salvos no seu banco de talentos, prontos para serem encontrados e convidados em processos futuros, sem custo adicional.' },
    { title: 'Converse com a IA sobre seus candidatos', desc: 'Faça perguntas em linguagem natural como "quem tem experiência com React e mora em São Paulo?" e receba respostas imediatas baseadas nos dados reais do seu processo.' },
    { title: 'Sugestões de perguntas para entrevista', desc: 'Com base no currículo e na vaga, a IA propõe um roteiro de perguntas sob medida para investigar os pontos críticos de cada candidato e tornar a entrevista mais objetiva.' },
    { title: 'Encontre talentos por competência', desc: 'Busque no seu banco por habilidades, experiências e formação, e não apenas por palavras-chave. A busca entende o contexto e traz resultados relevantes mesmo quando o termo exato não aparece no currículo.' },
  ];

  // Removido: a seção de AI Insights foi integrada ao chat assistente. Mantido vazio para referência histórica.

  const reviews = [
    {
      name: 'Camila Ferreira',
      role: 'Head de Atração de Talentos',
      bg: '3b82f6',
      company: 'TalentHub Solutions',
      text: '"O Usabit people transformou a nossa operação. Centralizar as candidaturas em portais de vagas personalizados e fazer a triagem em lote de currículos em PDF com a IA acelerou nosso fluxo operacional em mais de 10x."',
      metricValue1: '10 Dias',
      metricLabel1: 'Poupados em triagem manual',
      metricValue2: '15 Min',
      metricLabel2: 'Configuração do portal de vagas',
      image: `${import.meta.env.BASE_URL}logos/Professional.jpeg`,
      imagePosition: '55% center',
      avatar: `${import.meta.env.BASE_URL}logos/mulher%202.png`,
      avatarPosition: 'center top'
    },
    {
      name: 'Rafael Santos',
      role: 'Gerente de Tecnologia',
      bg: '0284c7',
      company: 'ScaleTech Inc.',
      text: '"Com os perfis de acesso isolados (RLS), nossos gestores avaliam os candidatos da própria área de forma transparente e colaborativa, sem acessar os dados confidenciais do RH."',
      metricValue1: '100%',
      metricLabel1: 'Isolamento de dados por vaga',
      metricValue2: '1 Click',
      metricLabel2: 'Importação em lote de currículos',
      image: `${import.meta.env.BASE_URL}logos/Close-up_of_hands.jpeg`,
      imagePosition: 'center',
      avatar: `${import.meta.env.BASE_URL}logos/homem.jpg`,
      avatarPosition: 'center top'
    },
    {
      name: 'Ana Beatriz Lima',
      role: 'Head de Gestão de RH',
      bg: '10b981',
      company: 'Inovação Digital',
      text: '"Poder criar portais de vagas customizados com a nossa identidade e fazer a triagem assistida com a IA sem perder o toque sensível do nosso time trouxe eficiência e profissionalismo ao nosso RH."',
      metricValue1: '95%',
      metricLabel1: 'Satisfação dos gestores de área',
      metricValue2: '10x',
      metricLabel2: 'Triagem de PDFs mais rápida',
      image: `${import.meta.env.BASE_URL}illustrations/hr-illustration.png`,
      imagePosition: 'center',
      avatar: `${import.meta.env.BASE_URL}logos/mulher.jpg`,
      avatarPosition: 'center top'
    }
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .lp-root, .lp-root * { font-family: 'Inter', sans-serif !important; }
        .lp-title, .lp-section-title, .lp-cta-title, .lp-logo { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .lp-root { background: #070a10; color: #e2e8f0; min-height: 100vh; overflow-x: hidden; position: relative; z-index: 1; }
        .lp-bg-layer {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 10%, rgba(20,184,166,0.05) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 20% 80%, rgba(59,130,246,0.04) 0%, transparent 50%),
            #070a10;
        }
 
        /* ── NAV ── */
        .lp-nav { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 12px 40px; background: rgba(7,9,15,0.85); backdrop-filter: blur(24px); border: 1px solid transparent; background-image: linear-gradient(rgba(7,9,15,0.85), rgba(7,9,15,0.85)), linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(20,184,166,0.5) 50%, rgba(59,130,246,0.7) 100%); background-origin: border-box; background-clip: padding-box, border-box; box-shadow: 0 0 24px rgba(59,130,246,0.25), 0 0 0 1px rgba(59,130,246,0.1), 0 12px 40px rgba(0,0,0,0.5); border-radius: 20px; max-width: 1300px; width: calc(100% - 40px); transition: box-shadow 0.3s ease; }
        .lp-nav:hover { box-shadow: 0 0 32px rgba(59,130,246,0.4), 0 0 0 1px rgba(59,130,246,0.2), 0 12px 40px rgba(0,0,0,0.5); }
        .lp-logo { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #fff; background: transparent; border: none; padding: 0; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
        .lp-logo:hover { opacity: 0.85; transform: translateY(-1px); }
        .lp-logo:active { transform: translateY(0); }
        .lp-nav-links { display: flex; align-items: center; gap: 4px; }
        .lp-nav-link {
          background: transparent; color: rgba(255,255,255,0.7); border: none; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; position: relative; overflow: hidden;
          letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 0 8px rgba(96,165,250,0.0);
          transition: color 0.3s, background 0.3s, letter-spacing 0.3s, text-shadow 0.3s;
        }
        .lp-nav-link:hover { color: #93c5fd; background: rgba(59,130,246,0.04); letter-spacing: 1.5px; text-shadow: 0 0 12px rgba(96,165,250,0.5); }
        .lp-nav-link::before, .lp-nav-link::after {
          content: ""; position: absolute; width: 0; height: 1px; background: #60a5fa; box-shadow: 0 0 6px #60a5fa; transition: width 0.4s ease;
        }
        .lp-nav-link::before { top: 4px; left: 50%; transform: translateX(-50%); }
        .lp-nav-link::after { bottom: 4px; right: 50%; transform: translateX(50%); }
        .lp-nav-link:hover::before, .lp-nav-link:hover::after { width: calc(100% - 24px); }
        .lp-nav-actions { display: flex; align-items: center; gap: 10px; }
 
        /* ── BUTTONS ── */
        .btn-ghost, .btn-primary, .btn-hero-primary, .btn-hero-ghost, .btn-price {
          outline: 0;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          border: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
          box-sizing: border-box;
          font-family: 'Inter', sans-serif !important;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.2s ease;
          position: relative;
        }

        .btn-ghost:hover, .btn-primary:hover, .btn-hero-primary:hover, .btn-hero-ghost:hover, .btn-price:hover {
          filter: brightness(1.05);
          transform: translateY(-2px);
        }

        .btn-ghost .animation, .btn-primary .animation, .btn-hero-primary .animation, .btn-hero-ghost .animation, .btn-price .animation {
          border-radius: 100%;
          animation: ripple 0.9s linear infinite;
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.7);
          margin-left: 14px;
          flex-shrink: 0;
        }

        @keyframes ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.18), 0 0 0 20px rgba(255, 255, 255, 0.14), 0 0 0 40px rgba(255, 255, 255, 0.10), 0 0 0 60px rgba(255, 255, 255, 0.06);
          }
          100% {
            box-shadow: 0 0 0 20px rgba(255, 255, 255, 0.14), 0 0 0 40px rgba(255, 255, 255, 0.10), 0 0 0 60px rgba(255, 255, 255, 0.06), 0 0 0 80px rgba(255, 255, 255, 0);
          }
        }

        .btn-ghost { background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); padding: 10px 18px; min-width: 130px; }
        .btn-ghost:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; padding: 11px 18px; min-width: 170px; box-shadow: 0 4px 12px rgba(59,130,246,0.25); text-decoration: none; }
        .btn-primary:hover { box-shadow: 0 8px 24px rgba(59,130,246,0.4); }

        /* ── HERO ── */
        .lp-hero { position: relative; z-index: 1; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 140px 60px 80px; overflow: visible; }
        .lp-hero-card { background: transparent; border: none; border-radius: 0; padding: 60px; display: flex; align-items: center; gap: 48px; max-width: 1600px; width: 100%; overflow: visible; }
        .lp-hero-left { flex: 0.8; min-width: 0; text-align: left; overflow: visible; }
        .lp-hero-left .lp-sub { margin-left: 0; }
        .lp-hero-left .lp-hero-btns { justify-content: flex-start; }
        .lp-hero-right { flex: 1.2; display: flex; align-items: center; justify-content: center; position: relative; }
        .lp-hero-illustration {
          width: 100%;
          max-width: 860px;
          aspect-ratio: 16 / 10;
          border-radius: 24px;
          filter: drop-shadow(0 20px 60px rgba(59,130,246,0.25));
          animation: heroFloat 6s ease-in-out infinite;
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .lp-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); border-radius: 100px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #93c5fd; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; animation: fadeSlideIn 0.8s both; }
        .lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; animation: pulse-badge 2s infinite; }
        @keyframes pulse-badge { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        .lp-title { font-size: clamp(42px,5.5vw,72px); font-weight: 800; line-height: 1.08; letter-spacing: -2.5px; margin-bottom: 24px; animation: fadeSlideIn 0.9s 0.1s both; background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding-right: 4px; }
        .lp-title-accent { background: linear-gradient(135deg, #3b82f6, #0ea5e9, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lp-sub { font-size: clamp(15px, 1.15vw, 17px); color: rgba(255,255,255,0.65); max-width: 540px; line-height: 1.6; margin-bottom: 36px; animation: fadeSlideIn 1s 0.2s both; }
        .lp-hero-btns { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; animation: fadeSlideIn 1s 0.3s both; }
        .btn-hero-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; padding: 16px 20px; min-width: 240px; box-shadow: 0 6px 20px rgba(59,130,246,0.3); text-decoration: none; }
        .btn-hero-primary:hover { box-shadow: 0 12px 32px rgba(59,130,246,0.45); }
        .btn-hero-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.12); padding: 16px 20px; min-width: 240px; backdrop-filter: blur(10px); }
        .btn-hero-ghost:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }

        /* ── STATS ── */
        .lp-stats { position: relative; z-index: 1; display: flex; justify-content: center; padding: 0 40px 100px; flex-wrap: wrap; }
        .lp-stat { padding: 28px 60px; text-align: center; border-right: 1px solid rgba(255,255,255,0.07); }
        .lp-stat:last-child { border-right: none; }
        .lp-stat-num { font-size: clamp(48px, 5.5vw, 68px); font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, #3b82f6, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lp-stat-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.55); margin-top: 8px; }

        /* ── HOW IT WORKS ── */
        .lp-how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; position: relative; max-width: 1120px; margin: 0 auto; }
        .lp-how-step {
          position: relative;
          z-index: 1;
          text-align: left;
          padding: 40px 36px;
          background: #070a10;
          box-shadow: 0 2px 4px 0 rgba(59,130,246,0.12), 0 8px 24px 0 rgba(37,44,97,0.25);
          border: 1px solid rgba(59,130,246,0.18);
          border-radius: 15px;
          overflow: hidden;
          transition: transform 0.7s cubic-bezier(0.4,0,0.2,1), background 0.5s, border-color 0.5s, box-shadow 0.5s;
        }
        .lp-how-step::before {
          content: "";
          position: absolute;
          width: 170px;
          height: 400px;
          z-index: -1;
          transform: rotate(42deg);
          right: -56px;
          top: -23px;
          border-radius: 35px;
        }
        .lp-how-step:nth-child(1)::before { background: linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.10) 100%); }
        .lp-how-step:nth-child(2)::before { background: linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.10) 100%); }
        .lp-how-step:nth-child(3)::before { background: linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%); }
        .lp-how-step .hover_color_bubble {
          position: absolute;
          width: 60rem;
          height: 60rem;
          left: 0;
          right: 0;
          z-index: -1;
          top: 16rem;
          border-radius: 50%;
          transform: rotate(-36deg) translateX(-30%);
          left: -18rem;
          transition: top 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        .lp-how-step:nth-child(1) .hover_color_bubble { background: radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(37,99,235,0.15) 60%, transparent 75%); }
        .lp-how-step:nth-child(2) .hover_color_bubble { background: radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(109,40,217,0.15) 60%, transparent 75%); }
        .lp-how-step:nth-child(3) .hover_color_bubble { background: radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.15) 60%, transparent 75%); }
        .lp-how-step:hover {
          border-color: rgba(255,255,255,0.25);
          transform: translateY(-4px) scale(1.04);
          z-index: 9;
        }
        .lp-how-step:nth-child(1):hover { background: linear-gradient(140deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); box-shadow: 0 12px 40px rgba(59,130,246,0.45); }
        .lp-how-step:nth-child(2):hover { background: linear-gradient(140deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%); box-shadow: 0 12px 40px rgba(139,92,246,0.45); }
        .lp-how-step:nth-child(3):hover { background: linear-gradient(140deg, #34d399 0%, #10b981 50%, #047857 100%); box-shadow: 0 12px 40px rgba(16,185,129,0.45); }
        .lp-how-step:hover::before { background: rgba(255,255,255,0.10); }
        .lp-how-step:hover .hover_color_bubble { top: 0rem; }
        .lp-how-step:hover .lp-how-step-number { color: rgba(255,255,255,0.25); }
        .lp-how-step:hover .lp-how-step-title,
        .lp-how-step:hover .lp-how-step-desc { color: #fff; }
        .lp-how-step-number {
          font-size: 56px; font-weight: 800; line-height: 1;
          color: rgba(255,255,255,0.08);
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: -2px;
          margin-bottom: 24px;
          position: relative; z-index: 1;
          transition: color 0.5s;
        }
        .lp-how-step-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 12px; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; z-index: 1; transition: color 0.5s; }
        .lp-how-step-desc { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.7; position: relative; z-index: 1; transition: color 0.5s; }

        /* ── COMMON SECTION ── */
        .lp-section { position: relative; z-index: 1; padding: 72px 80px 80px; max-width: 1400px; margin: 0 auto; width: 100%; }
        .lp-section-tag { text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #3b82f6; margin-bottom: 14px; }
        .lp-section-title { text-align: center; font-size: clamp(30px,4vw,48px); font-weight: 800; letter-spacing: -1.5px; margin-bottom: 14px; color: #fff; }
        .lp-section-sub { text-align: center; font-size: 17px; color: rgba(255,255,255,0.45); max-width: 720px; margin: 0 auto 40px; line-height: 1.7; white-space: nowrap; }
        #funcionalidades .lp-section-title,
        #funcionalidades .lp-section-sub { text-align: center; margin-left: auto; margin-right: auto; }

        /* ── FEATURES ── */
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .lp-features-layout {
          display: grid;
          grid-template-columns: minmax(320px, 0.85fr) 1.15fr;
          gap: 48px;
          align-items: stretch;
          max-width: 1180px;
          margin: 0 auto;
        }
        .lp-features-image {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          min-height: 460px;
          background: rgba(255,255,255,0.02);
        }
        .lp-features-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
        .lp-features-image-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(8,12,28,0.15) 0%, rgba(8,12,28,0.55) 100%);
          pointer-events: none;
        }
        .lp-features-list { display: flex; flex-direction: column; gap: 12px; }
        .lp-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding: 22px 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          text-align: left;
          cursor: pointer;
          color: inherit;
          font: inherit;
          transition: border-color 0.25s, background 0.25s, transform 0.25s;
          width: 100%;
        }
        .lp-feature-row:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
        .lp-feature-row.is-active { border-color: rgba(59,130,246,0.55); background: linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.02) 100%); }
        .lp-feature-row-body { flex: 1; min-width: 0; }
        .lp-feature-row-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .lp-feature-row-title { font-size: 17px; font-weight: 700; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; }
        .lp-feature-row-chevron { color: rgba(255,255,255,0.4); transition: transform 0.3s, color 0.3s; flex-shrink: 0; }
        .lp-feature-row.is-active .lp-feature-row-chevron { color: #60a5fa; transform: rotate(180deg); }
        .lp-feature-row-desc {
          font-size: 14px; line-height: 1.6;
          color: rgba(255,255,255,0.5);
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.35s ease, opacity 0.25s ease, margin-top 0.25s ease;
        }
        .lp-feature-row.is-active .lp-feature-row-desc { max-height: 220px; opacity: 1; margin-top: 10px; }

        /* ── PRICING ── */
        .lp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: stretch; }

        /* ── TESTIMONIALS (CAROUSEL CASE STUDY STYLE) ── */
        #depoimentos-section {
          background: rgba(59,130,246,0.03);
          border-top: 1px solid rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          padding: 72px 20px;
          position: relative;
          z-index: 1;
        }
        #depoimentos-section .lp-section-title {
          color: #fff;
          background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        #depoimentos-section .lp-section-sub {
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 48px;
          max-width: 720px;
        }
        #depoimentos-section .lp-title-accent {
          background: linear-gradient(135deg, #3b82f6, #0ea5e9, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-carousel-container {
          max-width: 1200px;
          margin: 0 auto;
          background: linear-gradient(180deg, rgba(59,130,246,0.06) 0%, rgba(20,184,166,0.03) 100%);
          border: 1px solid rgba(59,130,246,0.18);
          box-shadow: 0 0 0 1px rgba(59,130,246,0.04), 0 20px 60px rgba(59,130,246,0.08);
          border-radius: 32px;
          padding: 40px;
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          gap: 48px;
          position: relative;
          text-align: left;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .lp-carousel-container:hover {
          border-color: rgba(59,130,246,0.3);
          box-shadow: 0 0 0 1px rgba(59,130,246,0.06), 0 24px 70px rgba(59,130,246,0.12);
        }
        
        .lp-carousel-left {
          flex: 0.85;
          min-width: 0;
        }
        
        .lp-carousel-image {
          width: 100%;
          height: 440px;
          border-radius: 20px;
          object-fit: cover;
          display: block;
        }
        
        .lp-carousel-right {
          flex: 1.15;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 440px;
          text-align: left;
        }
        
        .lp-carousel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .lp-carousel-company {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .lp-carousel-nav {
          display: flex;
          gap: 12px;
        }
        
        .lp-carousel-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }
        .lp-carousel-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        
        .lp-carousel-quote {
          font-size: clamp(18px, 2.2vw, 22px);
          font-weight: 700;
          line-height: 1.5;
          color: #ffffff;
          margin-bottom: 28px;
          letter-spacing: -0.5px;
        }
        
        .lp-carousel-author-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        
        .lp-carousel-author-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .lp-carousel-author-name {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }
        
        .lp-carousel-author-role {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 1px;
        }
        
        .lp-carousel-footer {
          border-top: 1.5px solid rgba(255, 255, 255, 0.06);
          padding-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .lp-carousel-metrics {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        
        .lp-carousel-metric {
          display: flex;
          flex-direction: column;
        }
        
        .lp-carousel-metric-val {
          font-size: clamp(26px, 3vw, 32px);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          letter-spacing: -1px;
        }
        
        .lp-carousel-metric-lbl {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
          font-weight: 500;
        }
        
        .lp-carousel-divider {
          width: 1.5px;
          height: 36px;
          background: rgba(255, 255, 255, 0.06);
        }
        
        .lp-carousel-link {
          outline: 0;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff;
          border: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          padding: 14px 22px;
          min-width: 280px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.2s ease;
          text-decoration: none;
          position: relative;
        }
        .lp-carousel-link:hover {
          box-shadow: 0 10px 28px rgba(59,130,246,0.45);
          filter: brightness(1.05);
          transform: translateY(-2px);
        }
        .lp-carousel-link .animation {
          border-radius: 100%;
          animation: ripple 0.9s linear infinite;
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.7);
          margin-left: 14px;
          flex-shrink: 0;
        }

        /* ── CTA ── */
        .lp-cta { position: relative; z-index: 1; padding: 100px 40px 80px; overflow: hidden; }
        .lp-cta-inner { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; text-align: center; }
        .lp-cta-title { font-size: clamp(32px,4.5vw,52px); font-weight: 800; color: #fff; letter-spacing: -1.5px; margin-bottom: 12px; }
        .lp-cta-sub { font-size: 17px; color: rgba(255,255,255,0.5); margin-bottom: 56px; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.65; }

        .lp-cta-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 900px; margin: 0 auto 56px; }
        .lp-metric-card {
          background: #070a10;
          box-shadow: 0 2px 4px 0 rgba(59,130,246,0.12), 0 8px 24px 0 rgba(37,44,97,0.25);
          border: 1px solid rgba(59,130,246,0.18);
          border-radius: 15px;
          margin: 8px;
          padding: 32px 24px;
          position: relative;
          z-index: 1;
          overflow: hidden;
          min-height: 240px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          transition: transform 0.7s cubic-bezier(0.4,0,0.2,1), background 0.5s, border-color 0.5s, box-shadow 0.5s;
        }
        .lp-metric-card::before {
          content: "";
          position: absolute;
          width: 170px;
          height: 400px;
          z-index: -1;
          transform: rotate(42deg);
          right: -56px;
          top: -23px;
          border-radius: 35px;
        }
        .lp-metric-card:nth-child(1)::before { background: linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.10) 100%); }
        .lp-metric-card:nth-child(2)::before { background: linear-gradient(135deg, rgba(45,212,191,0.18) 0%, rgba(20,184,166,0.10) 100%); }
        .lp-metric-card:nth-child(3)::before { background: linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(22,163,74,0.10) 100%); }
        .lp-metric-card .hover_color_bubble {
          position: absolute;
          width: 60rem;
          height: 60rem;
          left: 0;
          right: 0;
          z-index: -1;
          top: 16rem;
          border-radius: 50%;
          transform: rotate(-36deg) translateX(-30%);
          left: -18rem;
          transition: top 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        .lp-metric-card:nth-child(1) .hover_color_bubble { background: radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(37,99,235,0.15) 60%, transparent 75%); }
        .lp-metric-card:nth-child(2) .hover_color_bubble { background: radial-gradient(circle, rgba(45,212,191,0.35) 0%, rgba(20,184,166,0.15) 60%, transparent 75%); }
        .lp-metric-card:nth-child(3) .hover_color_bubble { background: radial-gradient(circle, rgba(34,197,94,0.35) 0%, rgba(22,163,74,0.15) 60%, transparent 75%); }
        .lp-metric-card:hover {
          border-color: rgba(255,255,255,0.25);
          transform: scale(1.06);
          z-index: 9;
          box-shadow: 0 12px 40px rgba(59,130,246,0.4);
        }
        .lp-metric-card:nth-child(1):hover { background: linear-gradient(140deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); box-shadow: 0 12px 40px rgba(59,130,246,0.45); }
        .lp-metric-card:nth-child(2):hover { background: linear-gradient(140deg, #2dd4bf 0%, #14b8a6 50%, #0d9488 100%); box-shadow: 0 12px 40px rgba(45,212,191,0.45); }
        .lp-metric-card:nth-child(3):hover { background: linear-gradient(140deg, #22c55e 0%, #16a34a 50%, #166534 100%); box-shadow: 0 12px 40px rgba(34,197,94,0.45); }
        .lp-metric-card:hover::before {
          background: rgba(255,255,255,0.10);
        }
        .lp-metric-card:hover .hover_color_bubble {
          top: 0rem;
        }
        .lp-metric-card:hover .lp-metric-value,
        .lp-metric-card:hover .lp-metric-label {
          color: #fff;
          -webkit-text-fill-color: #fff;
          background: none;
        }
        .lp-metric-value {
          font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          position: relative; z-index: 1;
          white-space: nowrap;
          line-height: 1.2;
          transition: color 0.5s, -webkit-text-fill-color 0.5s, background 0.5s;
        }
        .lp-metric-card:nth-child(2) .lp-metric-value { background: linear-gradient(135deg, #2dd4bf, #06b6d4); -webkit-background-clip: text; background-clip: text; }
        .lp-metric-card:nth-child(3) .lp-metric-value { background: linear-gradient(135deg, #22c55e, #4ade80); -webkit-background-clip: text; background-clip: text; }
        .lp-metric-label { font-size: 14px; font-weight: 500; line-height: 1.55; color: rgba(255,255,255,0.55); position: relative; z-index: 1; transition: color 0.5s; max-width: 260px; margin: 0 auto; }

        .lp-cta-btn-wrap { margin-bottom: 20px; }
        .lp-cta-hint { font-size: 13px; color: rgba(255,255,255,0.25); margin-top: 0; }



        /* ── FOOTER ── */
        .lp-footer { position: relative; z-index: 1; width: 100%; }
        .lp-footer-inner {
          max-width: 1300px; margin: 0 auto;
          padding: 72px 64px 0;
        }
        .lp-footer-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 48px;
          gap: 40px;
        }
        .lp-footer-brand { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; flex: 1; min-width: 0; }
        @media (max-width: 768px) {
          .lp-footer-brand { gap: 22px; }
        }
        .lp-footer-tagline {
          font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.45);
          line-height: 1.5; margin: 0;
        }
        .lp-footer-actions {
          display: flex; align-items: center; gap: 20px; flex-shrink: 0;
        }
        .lp-footer-socials { display: flex; gap: 10px; align-items: center; }
        .lp-footer-social {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; text-decoration: none; position: relative;
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
          overflow: visible;
        }
        .lp-footer-social .lp-footer-social-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 100%; height: 100%; border-radius: 50%;
          position: relative; overflow: hidden; color: #3b82f6;
          z-index: 1; transition: color 0.3s ease;
        }
        .lp-footer-social .lp-footer-social-icon::before {
          content: ""; position: absolute; bottom: 0; left: 0;
          width: 100%; height: 0; border-radius: 50%;
          transition: height 0.3s ease; z-index: -1;
        }
        .lp-footer-social:hover .lp-footer-social-icon { color: #fff; }
        .lp-footer-social:hover { box-shadow: 5px 5px 10px rgba(0,0,0,0.4); }
        .lp-footer-social.linkedin:hover { background: #0274b3; border-color: #0274b3; }
        .lp-footer-social.linkedin .lp-footer-social-icon::before { background: #0274b3; }
        .lp-footer-social.linkedin:hover .lp-footer-social-icon::before { height: 100%; }
        .lp-footer-social.instagram:hover { background: linear-gradient(40deg, #0000ff, #f56040); border-color: transparent; }
        .lp-footer-social.instagram .lp-footer-social-icon::before { background: linear-gradient(40deg, #0000ff, #f56040); }
        .lp-footer-social.instagram:hover .lp-footer-social-icon::before { height: 100%; }
        .lp-footer-social.facebook:hover { background: #1877f2; border-color: #1877f2; }
        .lp-footer-social.facebook .lp-footer-social-icon::before { background: #1877f2; }
        .lp-footer-social.facebook:hover .lp-footer-social-icon::before { height: 100%; }
        .lp-footer-social.youtube:hover { background: #ff0000; border-color: #ff0000; }
        .lp-footer-social.youtube .lp-footer-social-icon::before { background: #ff0000; }
        .lp-footer-social.youtube:hover .lp-footer-social-icon::before { height: 100%; }
        .lp-footer-social.whatsapp:hover { background: #25d366; border-color: #25d366; }
        .lp-footer-social.whatsapp .lp-footer-social-icon::before { background: #25d366; }
        .lp-footer-social.whatsapp:hover .lp-footer-social-icon::before { height: 100%; }
        .lp-footer-social .lp-footer-social-name {
          position: absolute; top: -36px; font-size: 12px; font-weight: 600;
          color: #fff; transform: scale(0); transform-origin: center bottom;
          border-radius: 4px; padding: 4px 10px; white-space: nowrap;
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0; pointer-events: none; z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .lp-footer-social:hover .lp-footer-social-name { transform: scale(1); opacity: 1; }
        .lp-footer-social.linkedin .lp-footer-social-name { background: #0274b3; }
        .lp-footer-social.instagram .lp-footer-social-name { background: linear-gradient(40deg, #0000ff, #f56040); }
        .lp-footer-social.facebook .lp-footer-social-name { background: #1877f2; }
        .lp-footer-social.youtube .lp-footer-social-name { background: #ff0000; }
        .lp-footer-social.whatsapp .lp-footer-social-name { background: #25d366; }
        .lp-footer-social .lp-footer-social-name::after {
          content: ""; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%) rotate(45deg);
          width: 8px; height: 8px;
        }
        .lp-footer-social.linkedin .lp-footer-social-name::after { background: #0274b3; }
        .lp-footer-social.instagram .lp-footer-social-name::after { background: linear-gradient(40deg, #0000ff, #f56040); }
        .lp-footer-social.facebook .lp-footer-social-name::after { background: #1877f2; }
        .lp-footer-social.youtube .lp-footer-social-name::after { background: #ff0000; }
        .lp-footer-social.whatsapp .lp-footer-social-name::after { background: #25d366; }
        .lp-footer-divider {
          width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent);
          margin: 48px 0 28px;
        }
        .lp-footer-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-bottom: 36px;
        }
        .lp-footer-copy {
          font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.3); margin: 0;
        }
        .lp-footer-powered {
          font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.2); margin: 0;
        }
        .lp-footer-powered strong { color: rgba(255,255,255,0.45); font-weight: 700; }

        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 1024px) {
          .lp-grid-3, .lp-pricing-grid, .lp-reviews-grid { grid-template-columns: repeat(2,1fr); }
          .lp-how-grid { grid-template-columns: repeat(2,1fr); gap: 20px; }
          .lp-features-layout { grid-template-columns: 1fr; gap: 32px; }
          .lp-features-image { min-height: 320px; }
          .lp-cta-metrics { gap: 16px; }
          .lp-footer-inner { padding: 56px 40px 0; }
        }
        @media (max-width: 768px) {
          .lp-nav { padding: 8px 12px; width: calc(100% - 16px); top: 8px; border-radius: 14px; }
          .lp-logo { font-size: 16px; gap: 8px; }
          .lp-logo img { height: 28px !important; }
          .lp-nav-links { display: none; }
          .lp-nav-actions { gap: 6px; }
          .btn-ghost, .btn-primary { min-width: 0; padding: 7px 10px; font-size: 11px; white-space: nowrap; letter-spacing: 0.3px; }
          .btn-ghost span:last-child, .btn-primary span:last-child { display: none; }
          .lp-hero { flex-direction: column; padding: 110px 18px 60px; min-height: auto; }
          .lp-hero-card { flex-direction: column; padding: 28px 20px; text-align: center; }
          .lp-hero-left { text-align: center; }
          .lp-hero-left .lp-sub { margin-left: auto; margin-right: auto; }
          .lp-hero-left .lp-hero-btns { justify-content: center; }
          .lp-hero-right { margin-top: 28px; }
          .lp-hero-illustration { max-width: 100%; height: 220px; overflow: hidden; }
          .lp-hero-illustration video { transform: scale(1.5) !important; transform-origin: top left !important; width: 100% !important; height: 100% !important; object-fit: cover; }
          .lp-section { padding: 48px 18px 56px; }
          #depoimentos-section { padding: 48px 18px 56px; }
          .lp-section-title { font-size: clamp(26px, 7vw, 36px); letter-spacing: -1px; }
          .lp-section-sub { font-size: 15px; max-width: 100%; white-space: normal; margin-bottom: 28px; }
          .lp-grid-3, .lp-pricing-grid, .lp-reviews-grid { grid-template-columns: 1fr; }
          .lp-how-grid { grid-template-columns: 1fr; gap: 16px; }
          .lp-how-step { padding: 28px 24px; }
          .lp-how-step-number { font-size: 44px; margin-bottom: 16px; }
          .lp-features-layout { gap: 24px; }
          .lp-features-image { min-height: 240px; border-radius: 18px; }
          .lp-feature-row { padding: 18px 18px; }
          .lp-feature-row-title { font-size: 15px; }
          .lp-feature-row-desc { font-size: 13px; }
          .lp-stat { padding: 18px 22px; }
          .lp-cta { padding: 60px 18px 60px; }
          .lp-cta-title { font-size: clamp(26px, 7vw, 36px); }
          .lp-cta-sub { font-size: 15px; }
          .lp-cta-metrics { grid-template-columns: 1fr; max-width: 360px; }
          .lp-metric-card { padding: 24px 18px; }
          .lp-metric-value { font-size: 28px; }
          .lp-footer-inner { padding: 48px 18px 0; }
          .lp-footer-top { flex-direction: column; align-items: center; text-align: center; gap: 40px; }
          .lp-footer-brand { align-items: center; }
          .lp-footer-brand p { text-align: center; }
          .lp-footer-actions { flex-direction: column; width: 100%; align-items: center; margin-top: 8px; }
          .lp-footer-socials { margin-top: 28px; }
          .lp-footer-social { width: 50px; height: 50px; }
          .lp-footer-social .lp-footer-social-name { top: -42px; font-size: 11px; padding: 5px 10px; }
          .lp-footer-bottom { flex-direction: column; gap: 8px; text-align: center; align-items: center; }
          .usabit-people-logo-img { height: 32px !important; }
        }

        @media (max-width: 1024px) {
          .lp-carousel-container {
            flex-direction: column;
            gap: 20px;
            padding: 20px;
            border-radius: 24px;
          }
          .lp-carousel-left, .lp-carousel-right {
            flex: 1;
            width: 100%;
            min-width: 0;
          }
          .lp-carousel-image {
            height: 260px;
          }
          .lp-carousel-right {
            min-height: auto;
          }
        }
        @media (max-width: 560px) {
          .lp-carousel-container {
            padding: 16px;
            border-radius: 20px;
            gap: 16px;
          }
          .lp-carousel-image { height: 200px; }
          .lp-carousel-quote { font-size: 15px; }
          .lp-carousel-author-avatar { width: 38px; height: 38px; }
          .lp-carousel-author-name { font-size: 14px; }
          .lp-carousel-metric-val { font-size: 22px; }
          .lp-carousel-metrics { gap: 12px; }
          .lp-carousel-metric { padding: 8px 12px; }
        }
          .lp-carousel-footer {
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
          .lp-carousel-metrics {
            width: 100%;
            gap: 24px;
            justify-content: space-between;
          }
          .lp-carousel-link { width: 100%; max-width: 320px; margin: 0 auto; }
        }
      `}</style>

      <div className="lp-bg-layer" />

      <div className="lp-root">
        {/* ── NAV ── */}
        <nav className="lp-nav">
          <button className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Voltar ao topo">
            <UsabitPeopleLogo height={26} />
          </button>

          <div className="lp-nav-links">
            <button className="lp-nav-link" onClick={() => scrollTo('como-funciona')}>Como Funciona</button>
            <button className="lp-nav-link" onClick={() => scrollTo('funcionalidades')}>Funcionalidades</button>
            <button className="lp-nav-link" onClick={() => scrollTo('depoimentos')}>Depoimentos</button>
          </div>

          <div className="lp-nav-actions">
            <button className="btn-ghost" onClick={() => navigate('/login')}>
              Entrar
              <span className="animation"></span>
            </button>
            <a
              href="/registro"
              className="btn-primary"
              style={{ textDecoration: 'none' }}
              onClick={(e) => { e.preventDefault(); navigate('/registro'); }}
            >
              Começar Grátis
              <span className="animation"></span>
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-hero-card">
            <div className="lp-hero-left">
              <h1 className="lp-title">
                Recrutamento colaborativo<br />
                <span className="lp-title-accent">que integra seu time à IA</span>
              </h1>
              <p className="lp-sub">
                Integre a Inteligência Artificial à decisão do seu time. Centralize candidaturas e faça triagem de currículos em PDF de forma simples e colaborativa.
              </p>
              <div className="lp-hero-btns">
                <button className="btn-hero-primary" onClick={() => navigate('/registro')}>
                  <span>Comece a testar grátis agora</span>
                  <span className="animation"></span>
                </button>
              </div>
            </div>
            <div className="lp-hero-right">
              <div className="lp-hero-illustration overflow-hidden relative border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <video
                  src={`${import.meta.env.BASE_URL}logos/Person_interacting_holographic.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ transform: 'scale(1.28)', transformOrigin: 'top left' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── COMO FUNCIONA ── */}
        <div style={{ background: 'rgba(59,130,246,0.03)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', zIndex: 1 }}>
          <section id="como-funciona" className="lp-section">
            <div className="lp-section-tag">Como funciona</div>
            <h2 className="lp-section-title">Humano e IA, <span className="lp-title-accent">juntos em 3 passos</span></h2>
            <p className="lp-section-sub">Simples, rápido e com o equilíbrio perfeito entre tecnologia e olhar humano.</p>
            <div className="lp-how-grid">
              {howItWorks.map((item) => (
                <div key={item.step} className="lp-how-step">
                  <div className="hover_color_bubble"></div>
                  <div className="lp-how-step-number">{item.step}</div>
                  <div className="lp-how-step-title">{item.title}</div>
                  <div className="lp-how-step-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── FUNCIONALIDADES ── */}
        <section id="funcionalidades" className="lp-section">
          <h2 className="lp-section-title">Tudo que você precisa para recrutar <span className="lp-title-accent">com confiança</span></h2>
          <p className="lp-section-sub">A IA cuida do trabalho pesado. Você cuida das pessoas. Juntos, o processo seletivo ganha precisão e agilidade.</p>
          <div className="lp-features-layout">
            <div className="lp-features-image">
              <img
                src={`${import.meta.env.BASE_URL}logos/A_group_of_diverse_professionals_202606161746.jpeg`}
                alt="Equipe de RH usando o Usabit people"
                className="lp-features-photo"
              />
              <div className="lp-features-image-overlay" />
            </div>
            <div className="lp-features-list">
              {features.map((f, idx) => {
                const isActive = idx === activeFeature;
                return (
                  <button
                    key={f.title}
                    type="button"
                    className={`lp-feature-row${isActive ? ' is-active' : ''}`}
                    onClick={() => setActiveFeature(isActive ? -1 : idx)}
                    aria-expanded={isActive}
                  >
                    <div className="lp-feature-row-body">
                      <div className="lp-feature-row-head">
                        <span className="lp-feature-row-title">{f.title}</span>
                        <ChevronDown
                          size={18}
                          strokeWidth={2}
                          className={`lp-feature-row-chevron${isActive ? ' is-open' : ''}`}
                        />
                      </div>
                      <div className="lp-feature-row-desc">{f.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── DEPOIMENTOS (CAROUSEL) ── */}
        <div id="depoimentos-section">
          <section id="depoimentos" className="lp-section" style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="lp-section-title">
              Recrutadores que já unem <span className="lp-title-accent">inteligência humana e IA</span>
            </h2>
            <p className="lp-section-sub">
              Veja como equipes de RH estão transformando seus processos com o Usabit people
            </p>
            
            <div className="lp-carousel-container">
              <div className="lp-carousel-left">
                <img
                  src={`${import.meta.env.BASE_URL}logos/Diverse_female_HR_professional_in_202606161745.jpeg`}
                  alt="Recrutadores Usabit people"
                  className="lp-carousel-image"
                  style={{ objectPosition: 'center' }}
                />
              </div>
              <div className="lp-carousel-right">
                <div>
                  <div className="lp-carousel-header">
                    <span className="lp-carousel-company">
                      {reviews[activeReviewIndex].company}
                    </span>
                    <div className="lp-carousel-nav">
                      <button
                        className="lp-carousel-btn"
                        onClick={() => setActiveReviewIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1))}
                        title="Anterior"
                      >
                        ◀
                      </button>
                      <button
                        className="lp-carousel-btn"
                        onClick={() => setActiveReviewIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1))}
                        title="Próximo"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                  
                  <div className="lp-carousel-quote">
                    {reviews[activeReviewIndex].text}
                  </div>
                  
                  <div className="lp-carousel-author-info">
                    <img
                      src={reviews[activeReviewIndex].avatar ?? avatar(reviews[activeReviewIndex].name, reviews[activeReviewIndex].bg)}
                      alt={reviews[activeReviewIndex].name}
                      className="lp-carousel-author-avatar"
                      style={{ objectPosition: reviews[activeReviewIndex].avatarPosition ?? 'center' }}
                    />
                    <div>
                      <div className="lp-carousel-author-name">{reviews[activeReviewIndex].name}</div>
                      <div className="lp-carousel-author-role">{reviews[activeReviewIndex].role}</div>
                    </div>
                  </div>
                </div>
                
                <div className="lp-carousel-footer">
                  <div className="lp-carousel-metrics">
                    <div className="lp-carousel-metric">
                      <span className="lp-carousel-metric-val">{reviews[activeReviewIndex].metricValue1}</span>
                      <span className="lp-carousel-metric-lbl">{reviews[activeReviewIndex].metricLabel1}</span>
                    </div>
                    <div className="lp-carousel-divider"></div>
                    <div className="lp-carousel-metric">
                      <span className="lp-carousel-metric-val">{reviews[activeReviewIndex].metricValue2}</span>
                      <span className="lp-carousel-metric-lbl">{reviews[activeReviewIndex].metricLabel2}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate('/registro')}
                    className="lp-carousel-link"
                  >
                    <span>Comece a testar grátis agora</span>
                    <span className="animation"></span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── CTA FINAL ── */}
        <section className="lp-cta">
          <div className="lp-cta-inner">
            <h2 className="lp-cta-title">
              Sua equipe merece{' '}
              <span className="lp-title-accent">recrutar melhor</span>
            </h2>
            <p className="lp-cta-sub">
              Junte a inteligência da sua equipe com o poder da IA. Converse com nosso time e descubra como transformar seu processo seletivo.
            </p>

            {/* Metric cards with human tone */}
            <div className="lp-cta-metrics">
              <div className="lp-metric-card">
                <div className="hover_color_bubble"></div>
                <div className="lp-metric-value">Personalizado</div>
                <div className="lp-metric-label">Seu portal de carreiras com a sua cara: logotipo, cores e identidade visual aplicadas em cada vaga, do link à inscrição.</div>
              </div>
              <div className="lp-metric-card">
                <div className="hover_color_bubble"></div>
                <div className="lp-metric-value">Colaborativo</div>
                <div className="lp-metric-label">RH e gestores de área avaliam juntos no mesmo fluxo, com notas, comentários e histórico centralizado em um só lugar.</div>
              </div>
              <div className="lp-metric-card">
                <div className="hover_color_bubble"></div>
                <div className="lp-metric-value">RLS Seguro</div>
                <div className="lp-metric-label">Cada pessoa vê apenas o que deve ver. Isolamento por linha de vaga, criptografia e conformidade total com a LGPD.</div>
              </div>
            </div>

            <div className="lp-cta-btn-wrap">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-primary"
                style={{ margin: '0 auto', textDecoration: 'none' }}
              >
                <span>Falar com especialista →</span>
                <span className="animation"></span>
              </a>
            </div>
            <p className="lp-cta-hint">Sem compromisso · Atendimento humano · Resposta em minutos</p>
          </div>


        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            {/* Top row: brand + social */}
            <div className="lp-footer-top">
              <div className="lp-footer-brand">
                <UsabitPeopleLogo height={30} style={{ display: 'block' }} />
                <p className="lp-footer-tagline">Conectando talentos com inteligência — a junção entre humano e máquina</p>
              </div>

              <div className="lp-footer-actions">
                <div className="lp-footer-socials">
                  {[
                    { key: 'linkedin', name: 'LinkedIn', href: 'https://br.linkedin.com/company/usabit', d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                    { key: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/usabitglobal/', d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                    { key: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/usabitdigital', d: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                    { key: 'youtube', name: 'YouTube', href: 'https://www.youtube.com/@UsabitGlobal', d: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
                    { key: 'whatsapp', name: 'WhatsApp', href: 'https://wa.me/5511999999999', d: 'M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z' },
                  ].map(({ key, name, href, d }) => (
                    <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={`lp-footer-social ${key}`}>
                      <span className="lp-footer-social-name">{name}</span>
                      <span className="lp-footer-social-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Gradient divider */}
            <div className="lp-footer-divider" />

            {/* Bottom copyright */}
            <div className="lp-footer-bottom">
              <p className="lp-footer-copy">© 2026 Usabit. Todos os direitos reservados.</p>
              <p className="lp-footer-powered">Powered by <strong>Usabit people</strong></p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};
