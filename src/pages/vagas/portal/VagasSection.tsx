import { formatSalary } from '../../../core/utils/jobFormatter';

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

interface VagasSectionProps {
  vagas: Vaga[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  isMobile: boolean;
  tabsRef: React.RefObject<HTMLDivElement | null>;
  tabsOverflowing: boolean;
  onNavigate: (path: string) => void;
}

const CATEGORY_DISPLAY: Record<string, string> = {
  design: 'Design',
  desenvolvimento: 'Desenvolvimento',
  marketing: 'Marketing',
  vendas: 'Vendas',
};

export const VagasSection = ({
  vagas,
  activeCategory,
  setActiveCategory,
  isMobile,
  tabsRef,
  onNavigate,
}: VagasSectionProps) => {
  const categories = [
    'Todos',
    ...Array.from(new Set(vagas.map((v) => v.category || 'Outros'))).sort(
      (a, b) => {
        const order = ['design', 'desenvolvimento', 'marketing', 'vendas'];
        return (
          (order.indexOf(a.toLowerCase()) !== -1
            ? order.indexOf(a.toLowerCase())
            : 99) -
          (order.indexOf(b.toLowerCase()) !== -1
            ? order.indexOf(b.toLowerCase())
            : 99)
        );
      }
    ),
  ];

  const filteredVagas = vagas.filter(
    (v) =>
      activeCategory === 'Todos' ||
      (v.category || 'Outros') === activeCategory
  );

  const getDisplayCategory = (cat: string) =>
    CATEGORY_DISPLAY[cat.toLowerCase()] || cat;

  const getContractTypeLabel = (type: string | null | undefined) => {
    if (!type) return 'N/A';
    const types: Record<string, string> = {
      clt: 'CLT',
      pj: 'PJ',
      estagio: 'Estágio',
      freelancer: 'Freelancer',
    };
    return types[type.toLowerCase()] || type;
  };


  return (
    <section
      id="vagas"
      style={{
        padding: isMobile ? '60px 24px' : '80px 64px',
        maxWidth: 1440,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 32 : 48,
            lineHeight: '57.6px',
            letterSpacing: '-0.48px',
            color: '#F5F6F8',
            margin: '0 0 16px',
          }}
        >
          Vagas abertas
        </h2>
        <p
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            fontSize: isMobile ? 16 : 20,
            lineHeight: '28.8px',
            color: '#C3C7CD',
            margin: 0,
          }}
        >
          Venha transformar negócios com tecnologia, estratégia e design.
        </p>
      </div>

      {/* Tabs */}
      <div
        ref={tabsRef}
        className="category-tabs-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '8px 12px' : '8px 24px',
          marginBottom: isMobile ? 32 : 48,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0 0 12px 0',
        }}

      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const count = vagas.filter(
            (v) => cat === 'Todos' || (v.category || 'Outros') === cat
          ).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                position: 'relative',
                padding: '12px 8px',
                background: 'transparent',
                border: 'none',
                color: isActive ? '#F5F6F8' : '#C3C7CD',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                fontSize: isMobile ? 15 : 18,
                cursor: 'pointer',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                borderBottom: isActive ? '2px solid #2C58FD' : '2px solid transparent',
                flexShrink: 0,
              }}
            >
              {getDisplayCategory(cat)}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  fontFamily: "'Inter', sans-serif",
                  background: '#171C23',
                  color: '#C3C7CD',
                  padding: '2px 8px',
                  borderRadius: 4,
                  lineHeight: '16px',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Job Cards */}
      {filteredVagas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px' }}>
          <p style={{ color: '#5C636D', margin: 0, fontFamily: "'Manrope', sans-serif", fontSize: 16 }}>
            Nenhuma vaga encontrada.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24,
          }}
        >
          {filteredVagas.map((vaga) => (
            <div
              key={vaga.id}
              onClick={() => onNavigate(`/v/${vaga.public_hash}`)}
              style={{
                background: '#080C14',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8,
                padding: 32,
                transition: 'all 0.3s',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 500,
                  fontSize: 20,
                  lineHeight: '32px',
                  color: '#F5F6F8',
                  margin: 0,
                }}
              >
                {vaga.title}
              </h3>

              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: 13,
                  lineHeight: '24px',
                  letterSpacing: '0.16px',
                  color: '#5C636D',
                  margin: 0,
                }}
              >
                {vaga.work_regime === 'part-time'
                  ? 'Part time'
                  : 'Full time'}{' '}
                · {vaga.location || 'Remoto'} ·{' '}
                {getContractTypeLabel(vaga.contract_type)}
              </p>

              {vaga.has_salary_range && (
                <p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: '32px',
                    color: '#00A3F9',
                    margin: '8px 0 0',
                  }}
                >
                  {formatSalary(vaga.salary_min, vaga.salary_max)}
                </p>
              )}

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#F5F6F8',
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Ver mais detalhes
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
