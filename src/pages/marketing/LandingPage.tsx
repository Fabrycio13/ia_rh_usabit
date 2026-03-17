import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Fake avatar initials → use a color avatar service
const avatar = (name: string, bg: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=64&bold=true&font-size=0.4`;

export const LandingPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const NUM_STARS = 280;
    const stars = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.008 + 0.003,
      parallax: Math.random() * 0.04 + 0.01,
    }));

    let t = 0;
    const draw = () => {
      t += 0.012;
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#07090f');
      bg.addColorStop(1, '#0d1020');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      stars.forEach((s) => {
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed * 80));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${tw * 0.9})`;
        ctx.shadowBlur = s.r > 1.2 ? 5 : 0;
        ctx.shadowColor = 'white';
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', onResize); };
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const insights = [
    { icon: '🧠', title: 'Análise Semântica', desc: 'A IA interpreta o contexto do currículo, identificando habilidades reais e potencial oculto dos candidatos.', stat: '↗ Reduz erros de triagem em até 85%' },
    { icon: '💡', title: 'Insights Preditivos', desc: 'Identifica candidatos com maior probabilidade de sucesso antes mesmo da entrevista.', stat: '↗ Antecipa fit cultural com 90% de precisão' },
    { icon: '📈', title: 'Pontuação Inteligente', desc: 'Cada candidato recebe nota por habilidades técnicas, soft skills e aderência à vaga.', stat: '↗ Melhora qualidade das contratações em 60%' },
    { icon: '🎯', title: 'Priorização Automática', desc: 'A IA ordena os candidatos por relevância e urgência para você focar no que importa.', stat: '↗ Reduz tempo de contratação em 70%' },
    { icon: '🔍', title: 'Detecção de Padrões', desc: 'Reconhece padrões de sucesso em contratações anteriores e aplica ao processo atual.', stat: '↗ Aumenta assertividade em 50%' },
    { icon: '📋', title: 'Relatórios Automáticos', desc: 'Gera relatórios detalhados de cada análise com insights acionáveis prontos para apresentar.', stat: '↗ Economiza 3h por processo seletivo' },
  ];

  const reviews = [
    { name: 'Mariana Costa', role: 'Head of People, TechCorp Brasil', bg: '6366f1', text: '"O Space Talent revolucionou nosso processo de recrutamento. Conseguimos reduzir o tempo de triagem em 80% e a qualidade das contratações melhorou muito."' },
    { name: 'Rafael Santos', role: 'Gerente de RH, StartupXYZ', bg: '0284c7', text: '"Interface incrível e a IA é muito precisa. Nossa equipe adotou a ferramenta em questão de dias e hoje não consegue imaginar o processo sem ela."' },
    { name: 'Ana Beatriz Lima', role: 'Diretora de Operações, MegaCorp', bg: '10b981', text: '"Escalabilidade impressionante. Analisamos mais de 500 currículos por mês sem nenhum problema. O suporte é excepcional e sempre presente."' },
    { name: 'Pedro Alves', role: 'Talent Acquisition, ScaleUp', bg: 'f59e0b', text: '"O chat com a IA é um diferencial enorme. Consigo tirar dúvidas sobre qualquer candidato em segundos. Produto top de linha!"' },
    { name: 'Camila Ferreira', role: 'People Business Partner, FinTech SA', bg: 'ec4899', text: '"O pipeline Kanban integrado com a IA mudou nossa forma de trabalhar. Agora priorizamos candidatos com muito mais inteligência e eficiência."' },
    { name: 'Lucas Mendes', role: 'CEO, Agência Digital Marte', bg: '8b5cf6', text: '"Recomendo para qualquer empresa que queira modernizar o RH. ROI muito alto desde o primeiro mês. A melhor decisão que tomamos!"' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .lp-root { font-family: 'Space Grotesk', sans-serif; background: #07090f; color: #e2e8f0; min-height: 100vh; overflow-x: hidden; }
        .lp-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }

        /* ── NAV ── */
        .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 14px 60px; background: rgba(7,9,15,0.8); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .lp-logo { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #fff; }
        .lp-nav-links { display: flex; align-items: center; gap: 4px; }
        .lp-nav-link { background: transparent; color: rgba(255,255,255,0.6); border: none; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 500; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: color 0.2s, background 0.2s; }
        .lp-nav-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .lp-nav-actions { display: flex; align-items: center; gap: 10px; }
        .btn-ghost { background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); padding: 9px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: color 0.2s, background 0.2s; }
        .btn-ghost:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: none; padding: 10px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }

        /* ── HERO ── */
        .lp-hero { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 140px 40px 80px; text-align: center; }
        .lp-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 100px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #a5b4fc; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; animation: fadeSlideIn 0.8s both; }
        .lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; animation: pulse-badge 2s infinite; }
        @keyframes pulse-badge { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        .lp-title { font-size: clamp(42px,6vw,84px); font-weight: 800; line-height: 1.06; letter-spacing: -2.5px; margin-bottom: 24px; animation: fadeSlideIn 0.9s 0.1s both; background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lp-title-accent { background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lp-sub { font-size: clamp(16px,2vw,20px); color: rgba(255,255,255,0.5); max-width: 560px; line-height: 1.7; margin-bottom: 44px; animation: fadeSlideIn 1s 0.2s both; }
        .lp-hero-btns { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; animation: fadeSlideIn 1s 0.3s both; }
        .btn-hero-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: none; padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 6px 30px rgba(99,102,241,0.4); display: flex; align-items: center; gap: 10px; }
        .btn-hero-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(99,102,241,0.55); }
        .btn-hero-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.12); padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: background 0.2s, transform 0.2s; backdrop-filter: blur(10px); }
        .btn-hero-ghost:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }

        /* ── STATS ── */
        .lp-stats { position: relative; z-index: 1; display: flex; justify-content: center; padding: 0 40px 100px; flex-wrap: wrap; }
        .lp-stat { padding: 28px 50px; text-align: center; border-right: 1px solid rgba(255,255,255,0.07); }
        .lp-stat:last-child { border-right: none; }
        .lp-stat-num { font-size: 42px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lp-stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); margin-top: 4px; }

        /* ── COMMON SECTION ── */
        .lp-section { position: relative; z-index: 1; padding: 100px 80px 120px; max-width: 1400px; margin: 0 auto; width: 100%; }
        .lp-section-tag { text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6366f1; margin-bottom: 14px; }
        .lp-section-title { text-align: center; font-size: clamp(30px,4vw,48px); font-weight: 800; letter-spacing: -1.5px; margin-bottom: 14px; color: #fff; }
        .lp-section-sub { text-align: center; font-size: 17px; color: rgba(255,255,255,0.45); max-width: 580px; margin: 0 auto 64px; line-height: 1.7; }

        /* ── FEATURES ── */
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .lp-feature-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; padding: 40px 36px; transition: border-color 0.3s, transform 0.3s, background 0.3s; }
        .lp-feature-card:hover { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); transform: translateY(-5px); }
        .lp-feature-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 22px; }
        .lp-feature-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 12px; }
        .lp-feature-desc { font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.5); }

        /* ── AI INSIGHTS ── */
        .lp-insights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .lp-insight-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 26px; transition: border-color 0.3s, transform 0.3s; }
        .lp-insight-card:hover { border-color: rgba(99,102,241,0.35); transform: translateY(-3px); }
        .lp-insight-ico { width: 42px; height: 42px; border-radius: 12px; background: rgba(99,102,241,0.18); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; }
        .lp-insight-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .lp-insight-desc { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 16px; }
        .lp-insight-stat { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #6ee7b7; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.15); border-radius: 8px; padding: 8px 14px; }
        .lp-insights-cta { text-align: center; margin-top: 48px; }

        /* ── PRICING ── */
        .lp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: stretch; }
        .lp-price-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px 36px; position: relative; transition: transform 0.3s, border-color 0.3s; display: flex; flex-direction: column; }
        .lp-price-card:hover { transform: translateY(-4px); }
        .lp-price-card.popular { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.06); }
        .lp-price-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; font-size: 11px; font-weight: 700; padding: 5px 18px; border-radius: 100px; white-space: nowrap; }
        .lp-price-name { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .lp-price-value { font-size: 50px; font-weight: 800; color: #fff; letter-spacing: -2px; line-height: 1; display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
        .lp-price-value span { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.4); letter-spacing: 0; line-height: 1.4; }
        .lp-price-desc { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 28px; margin-top: 8px; }
        .lp-price-features { list-style: none; display: flex; flex-direction: column; gap: 13px; margin-bottom: 32px; flex: 1; }
        .lp-price-features li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: rgba(255,255,255,0.7); }
        .lp-price-features li::before { content: '✓'; color: #6366f1; font-weight: 700; flex-shrink: 0; font-size: 15px; }
        .btn-price { width: 100%; padding: 15px; border-radius: 13px; font-size: 15px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; border: none; margin-top: auto; }
        .btn-price-main { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
        .btn-price-main:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }
        .btn-price-ghost { background: transparent; color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.12) !important; }
        .btn-price-ghost:hover { background: rgba(255,255,255,0.04); color: #fff; }

        /* ── TESTIMONIALS ── */
        .lp-reviews-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .lp-review-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 32px; transition: border-color 0.3s, transform 0.3s; display: flex; flex-direction: column; }
        .lp-review-card:hover { border-color: rgba(99,102,241,0.25); transform: translateY(-3px); }
        .lp-review-stars { color: #f59e0b; font-size: 17px; margin-bottom: 16px; letter-spacing: 3px; }
        .lp-review-text { font-size: 15px; color: rgba(255,255,255,0.7); line-height: 1.75; font-style: italic; margin-bottom: 24px; flex: 1; }
        .lp-review-footer { display: flex; align-items: center; gap: 12px; }
        .lp-review-avatar { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.1); }
        .lp-review-author { font-size: 14px; font-weight: 700; color: #fff; }
        .lp-review-role { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }

        /* ── CTA ── */
        .lp-cta { position: relative; z-index: 1; padding: 80px 40px 140px; }
        .lp-cta-card { 
          background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.1)); 
          border: 1px solid rgba(99,102,241,0.28); 
          border-radius: 32px; 
          padding: 90px 100px; 
          text-align: center;
          backdrop-filter: blur(20px);
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }
        .lp-cta-title { font-size: clamp(32px,4.5vw,56px); font-weight: 800; color: #fff; letter-spacing: -1.5px; margin-bottom: 16px; }
        .lp-cta-sub { font-size: 18px; color: rgba(255,255,255,0.5); margin-bottom: 44px; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.6; }
        .lp-cta-hint { font-size: 13px; color: rgba(255,255,255,0.25); margin-top: 18px; }

        /* ── FOOTER ── */
        .lp-footer { position: relative; z-index: 1; text-align: center; padding: 28px 40px 44px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 13px; color: rgba(255,255,255,0.2); }

        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 1024px) {
          .lp-grid-3, .lp-pricing-grid, .lp-reviews-grid, .lp-insights-grid { grid-template-columns: repeat(2,1fr); }
          .lp-cta-card { padding: 60px 48px; }
        }
        @media (max-width: 768px) {
          .lp-nav { padding: 14px 20px; }
          .lp-nav-links { display: none; }
          .lp-hero { padding: 120px 20px 60px; }
          .lp-grid-3, .lp-pricing-grid, .lp-reviews-grid { grid-template-columns: 1fr; }
          .lp-section { padding: 60px 24px 80px; }
          .lp-stat { padding: 18px 22px; }
          .lp-cta-card { padding: 48px 24px; }
        }
      `}</style>

      <div className="lp-root">
        <canvas ref={canvasRef} className="lp-canvas" />

        {/* ── NAV ── */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <img
              src={`${import.meta.env.BASE_URL}space-talent-favicon.svg`}
              alt="Space Talent"
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
            <span>Space Talent</span>
          </div>

          <div className="lp-nav-links">
            <button className="lp-nav-link" onClick={() => scrollTo('funcionalidades')}>Funcionalidades</button>
            <button className="lp-nav-link" onClick={() => scrollTo('ia-insights')}>IA Insights</button>
            <button className="lp-nav-link" onClick={() => scrollTo('precos')}>Preços</button>
            <button className="lp-nav-link" onClick={() => scrollTo('depoimentos')}>Depoimentos</button>
          </div>

          <div className="lp-nav-actions">
            <button className="btn-ghost" onClick={() => navigate('/login')}>Entrar</button>
            <button className="btn-primary" onClick={() => navigate('/login')}>Começar Grátis</button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <h1 className="lp-title">
            Recrutamento inteligente<br />
            <span className="lp-title-accent">do universo para você</span>
          </h1>
          <p className="lp-sub">Analise currículos com IA de ponta, encontre os melhores talentos em segundos e construa o time dos seus sonhos.</p>
          <div className="lp-hero-btns">
            <button className="btn-hero-primary" onClick={() => navigate('/login')}>🚀 Começar Grátis</button>
            <button className="btn-hero-ghost" onClick={() => navigate('/login')}>Entrar na conta</button>
          </div>
        </section>

        {/* ── STATS ── */}
        <div className="lp-stats">
          {[
            { num: '200+', label: 'Análises / Dia' },
            { num: '95%', label: 'Precisão' },
            { num: '10x', label: 'Mais Rápido' },
            { num: '100%', label: 'IA Generativa' },
          ].map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-num">{s.num}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FUNCIONALIDADES ── */}
        <section id="funcionalidades" className="lp-section">
          <h2 className="lp-section-title">Tudo que você precisa para contratar melhor</h2>
          <p className="lp-section-sub">Da triagem ao pipeline, nossa IA cuida de todo o processo seletivo com precisão e agilidade excepcional.</p>
          <div className="lp-grid-3">
            {[
              { icon: '🤖', bg: 'rgba(99,102,241,0.15)', title: 'IA de Análise Avançada', desc: 'Nosso modelo lê e pontua cada currículo em segundos, identificando o candidato ideal para sua vaga com altíssima precisão.' },
              { icon: '🪐', bg: 'rgba(16,185,129,0.12)', title: 'Dashboard Espacial', desc: 'Visualize métricas, candidatos avaliados e aprovações em um painel imersivo com dados em tempo real e gráficos interativos.' },
              { icon: '🌌', bg: 'rgba(245,158,11,0.12)', title: 'Pipeline de Recrutamento', desc: 'Gerencie candidatos em cada etapa do processo seletivo com um Kanban intuitivo de arrastar e soltar.' },
              { icon: '💬', bg: 'rgba(139,92,246,0.15)', title: 'Chat com IA', desc: 'Converse com a IA para obter insights detalhados sobre cada candidato, comparar perfis e tirar dúvidas em segundos.' },
              { icon: '📊', bg: 'rgba(239,68,68,0.1)', title: 'Banco de Talentos', desc: 'Centralize todos os candidatos com histórico completo, comentários da equipe e avaliações por estrelas.' },
              { icon: '⚡', bg: 'rgba(59,130,246,0.12)', title: 'Integração Simples', desc: 'Importe currículos em PDF com um clique e tenha resultados completos em segundos, sem configuração complexa.' },
            ].map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon" style={{ background: f.bg }}>{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI INSIGHTS ── */}
        <div style={{ background: 'rgba(99,102,241,0.04)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
          <section id="ia-insights" className="lp-section">
            <h2 className="lp-section-title">Insights de IA que <span className="lp-title-accent">transformam decisões</span></h2>
            <p className="lp-section-sub">Nossa IA avançada analisa padrões, prevê o fit cultural e otimiza o processo para entregar resultados excepcionais.</p>
            <div className="lp-insights-grid">
              {insights.map((ins) => (
                <div key={ins.title} className="lp-insight-card">
                  <div className="lp-insight-ico">{ins.icon}</div>
                  <div className="lp-insight-title">{ins.title}</div>
                  <div className="lp-insight-desc">{ins.desc}</div>
                  <div className="lp-insight-stat">{ins.stat}</div>
                </div>
              ))}
            </div>
            <div className="lp-insights-cta">
              <button className="btn-hero-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/login')}>
                🧠 Experimentar a IA Grátis →
              </button>
            </div>
          </section>
        </div>

        {/* ── PREÇOS ── */}
        <section id="precos" className="lp-section">
          <h2 className="lp-section-title">Preços que crescem com seu negócio</h2>
          <p className="lp-section-sub">Comece grátis e faça upgrade quando precisar de mais recursos. Sem surpresas, sem compromisso.</p>
          <div className="lp-pricing-grid">
            <div className="lp-price-card">
              <div className="lp-price-name">Gratuito</div>
              <div className="lp-price-value">R$ 0 <span>/para sempre</span></div>
              <div className="lp-price-desc">Perfeito para começar</div>
              <ul className="lp-price-features">
                <li>Até 20 análises/mês</li>
                <li>Limite de 5 candidatos por análise</li>
                <li>Banco de candidatos limitado</li>
                <li>Dashboard de métricas</li>
                <li>Suporte por e-mail</li>
              </ul>
              <button className="btn-price btn-price-ghost" onClick={() => navigate('/login')}>Começar Grátis</button>
            </div>

            <div className="lp-price-card popular">
              <div className="lp-price-badge">Mais Popular</div>
              <div className="lp-price-name">Profissional</div>
              <div className="lp-price-value">R$ 97<span>/por mês</span></div>
              <div className="lp-price-desc">Para equipes em crescimento</div>
              <ul className="lp-price-features">
                <li>Análises ilimitadas</li>
                <li>Até 5 usuários</li>
                <li>IA avançada + Chat</li>
                <li>Pipeline Kanban</li>
                <li>Banco de talentos</li>
                <li>Relatórios detalhados</li>
                <li>Suporte prioritário</li>
              </ul>
              <button className="btn-price btn-price-main" onClick={() => navigate('/login')}>Teste Grátis 14 Dias</button>
            </div>

            <div className="lp-price-card">
              <div className="lp-price-name">Enterprise</div>
              <div className="lp-price-value">R$ 297<span>/por mês</span></div>
              <div className="lp-price-desc">Para grandes organizações</div>
              <ul className="lp-price-features">
                <li>Análises ilimitadas</li>
                <li>Usuários ilimitados</li>
                <li>IA customizada</li>
                <li>Integração com ATS</li>
                <li>SSO e segurança avançada</li>
                <li>Relatórios premium</li>
                <li>Suporte dedicado 24/7</li>
                <li>API personalizada</li>
              </ul>
              <button className="btn-price btn-price-ghost" onClick={() => navigate('/login')}>Falar com Vendas</button>
            </div>
          </div>
        </section>

        {/* ── DEPOIMENTOS ── */}
        <div style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
          <section id="depoimentos" className="lp-section">
            <h2 className="lp-section-title">Mais de 1.000 recrutadores confiam no Space Talent</h2>
            <p className="lp-section-sub">Veja o que nossos clientes dizem sobre a experiência com nossa plataforma</p>
            <div className="lp-reviews-grid">
              {reviews.map((r) => (
                <div key={r.name} className="lp-review-card">
                  <div className="lp-review-stars">★★★★★</div>
                  <div className="lp-review-text">{r.text}</div>
                  <div className="lp-review-footer">
                    <img
                      src={avatar(r.name, r.bg)}
                      alt={r.name}
                      className="lp-review-avatar"
                    />
                    <div>
                      <div className="lp-review-author">{r.name}</div>
                      <div className="lp-review-role">{r.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── CTA FINAL ── */}
        <section className="lp-cta">
          <div className="lp-cta-card">
            <h2 className="lp-cta-title">Pronto para decolar? 🚀</h2>
            <p className="lp-cta-sub">
              Junte-se a milhares de recrutadores que já transformaram seu processo com IA. Configuração em menos de 5 minutos.
            </p>
            <button className="btn-hero-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/login')}>
              🚀 Começar Teste Grátis Agora →
            </button>
            <p className="lp-cta-hint">Sem cartão de crédito · Cancele quando quiser · Configuração em 5 minutos</p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          © 2026 Space Talent · Todos os direitos reservados · Powered by usabit
        </footer>
      </div>
    </>
  );
};
