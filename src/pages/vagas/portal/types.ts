export interface NavbarItem {
  label: string;
  href: string;
  hasDropdown: boolean;
}

export interface AreaCard {
  title: string;
  image: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}
