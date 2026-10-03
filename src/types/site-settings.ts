export interface SiteSettings {
  id: string; // 'global'
  brandName: string;
  brandTagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutTitle: string;
  aboutDescription: string;
  contactEmail: string;
  contactPhone: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  updatedAt: number;
}
