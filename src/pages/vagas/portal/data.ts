import type { NavbarItem, AreaCard, FooterLinkGroup } from './types';

export const navbarItems: NavbarItem[] = [
  { label: 'Sobre', href: '#sobre', hasDropdown: false },
  { label: 'Soluções', href: '#solucoes', hasDropdown: true },
  { label: 'Cases', href: '#cases', hasDropdown: true },
  { label: 'Carreiras', href: '#carreiras', hasDropdown: false },
  { label: 'Contato', href: '#contato', hasDropdown: false },
];

export const areas: AreaCard[] = [
  { title: 'Design', image: '/illustrations/area-design.png' },
  { title: 'Desenvolvimento', image: '/illustrations/area-desenvolvimento.png' },
  { title: 'Marketing', image: '/illustrations/area-marketing.png' },
  { title: 'Relacionamento e Performance', image: '/illustrations/area-relacionamento.png' },
];

export const footerGroups: FooterLinkGroup[] = [
  {
    title: 'Soluções',
    links: [
      { label: 'UX & Product Design', href: '#' },
      { label: 'Desenvolvimento de Software', href: '#' },
      { label: 'Outsourcing', href: '#' },
      { label: 'Agentes de IA', href: '#' },
      { label: 'Transformação Digital', href: '#' },
      { label: 'CTO as a Service', href: '#' },
      { label: 'Cibersegurança', href: '#' },
    ],
  },
  {
    title: 'A Empresa',
    links: [
      { label: 'Sobre a Usabit', href: '#' },
      { label: 'Carreiras', href: '#carreiras' },
      { label: 'Cases de Sucesso', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Política de Privacidade', href: '#' },
      { label: 'Termos de uso', href: '#' },
    ],
  },
];
