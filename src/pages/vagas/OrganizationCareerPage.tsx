import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { NavbarPortal } from './portal/NavbarPortal';
import { HeroSection } from './portal/HeroSection';
import { AreasSection } from './portal/AreasSection';
import { VagasSection } from './portal/VagasSection';
import { FormSection } from './portal/FormSection';
import { FooterPortal } from './portal/FooterPortal';

interface Vaga {
  id: string;
  title: string;
  public_hash: string;
  has_salary_range: boolean;
  salary_min: number;
  salary_max: number;
  contract_type: string;
  work_regime: string;
  is_pcd: string;
  has_location: boolean;
  location: string;
  work_model: string;
  category: string;
  created_at: string;
  company_name: string | null;
}

interface OrgInfo {
  name: string;
  logo_url: string;
  cover_image_url: string;
  primary_color: string;
  about_text: string;
  font_family: string;
  font_color: string;
  logo_scale: number;
  cover_fit: 'cover' | 'contain';
  background_fit: 'cover' | 'contain';
  header_padding: number;
  page_background_url: string;
}

export const OrganizationCareerPage = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsOverflowing, setTabsOverflowing] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const check = () => setTabsOverflowing(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [vagas]);

  useEffect(() => {
    if (orgInfo?.name) {
      document.title = `Oportunidades | ${orgInfo.name}`;
    }
    return () => {
      document.title = 'Space Talent';
    };
  }, [orgInfo]);

  useEffect(() => {
    const fetchCareerPageData = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-jobs?orgId=${orgId}`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) {
          const errPayload = await response.json().catch(() => ({}));
          throw new Error(
            errPayload.error ||
              'Erro na API: Função não implementada ou fora do ar.'
          );
        }

        const { orgInfo, vagas } = await response.json();

        if (!orgInfo)
          throw new Error('Organização não encontrada na resposta da API');

        setOrgInfo({
          name: orgInfo.name,
          logo_url: orgInfo.logo_url || '',
          cover_image_url: orgInfo.cover_image_url || '',
          primary_color: orgInfo.primary_color || '#3b82f6',
          about_text: orgInfo.about_text || '',
          font_family: orgInfo.font_family || 'Inter',
          font_color: orgInfo.font_color || '#0f172a',
          logo_scale: orgInfo.logo_scale ?? 1.0,
          cover_fit: (orgInfo.cover_fit as 'cover' | 'contain') || 'cover',
          background_fit:
            (orgInfo.background_fit as 'cover' | 'contain') || 'cover',
          header_padding: orgInfo.header_padding ?? 24,
          page_background_url: orgInfo.page_background_url || '',
        });

        setVagas(vagas || []);
      } catch (err: unknown) {
        console.error('Erro ao carregar página de carreiras da API:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCareerPageData();
  }, [orgId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        <Loader2
          style={{
            width: 48,
            height: 48,
            color: '#2C58FD',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !orgInfo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#F5F6F8',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Página não encontrada
        </h1>
        <p
          style={{
            color: '#C3C7CD',
            maxWidth: 400,
            textAlign: 'center',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {error ||
            'A página de carreiras solicitada não existe ou foi removida.'}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 24,
            padding: '10px 20px',
            background: '#2C58FD',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        fontFamily: "'Manrope', sans-serif",
        color: '#ffffff',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

        html, body {
          background: #000 !important;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', sans-serif !important;
          color: #C3C7CD !important;
          line-height: 24px !important;
          letter-spacing: 0.16px !important;
        }

        body::before {
          content: "";
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 85% 80%, rgba(30, 80, 255, 0.22), transparent 60%);
          filter: blur(140px);
          z-index: 0;
          pointer-events: none;
        }

        h1, h2, h3, h4 {
          font-family: 'Space Grotesk', sans-serif !important;
          color: #ffffff !important;
        }

        .category-tabs-container {
          scrollbar-width: none;
        }
        .category-tabs-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <NavbarPortal isMobile={isMobile} />

      <HeroSection
        orgName={orgInfo.name}
        isMobile={isMobile}
        onScrollToVagas={() => {
          document.getElementById('vagas')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onNavigate={(path) => navigate(path)}
      />

      <AreasSection isMobile={isMobile} />

      <VagasSection
        vagas={vagas}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        isMobile={isMobile}
        tabsRef={tabsRef}
        tabsOverflowing={tabsOverflowing}
        onNavigate={(path) => {
          // Se for caminho absoluto começa com /, senão monta
          if (path.startsWith('/')) {
            navigate(path);
          } else {
            navigate(`/carreiras/${orgId}/${path}`);
          }
        }}
      />

      <FormSection
        orgId={orgId!}
        isMobile={isMobile}
        onNavigate={(path) => navigate(path)}
      />

      <FooterPortal isMobile={isMobile} />
    </div>
  );
};
