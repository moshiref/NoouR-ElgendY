/**
 * Site-wide content. Section anchors are declared here so the navigation
 * keeps working as the About / Work / Contact sections are added.
 */
export const BRAND = 'NoouR ElgendY';

export const SECTION_IDS = {
  home: 'home',
  about: 'about',
  work: 'work',
  contact: 'contact',
} as const;

export type NavLink = {
  label: string;
  href: `#${string}`;
};

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'About', href: `#${SECTION_IDS.about}` },
  { label: 'Work', href: `#${SECTION_IDS.work}` },
  { label: 'Contact', href: `#${SECTION_IDS.contact}` },
];

export const CTA_HREF = `#${SECTION_IDS.contact}` as const;
export const WORK_HREF = `#${SECTION_IDS.work}` as const;

export const HERO_DISCIPLINES = ['Creative Visuals', 'AI', 'UGC', 'Design'] as const;

export const STRIP_ITEMS = ['AI Video', 'Fashion', 'Medical', 'UGC', 'Design', 'Reviews'] as const;

export type ContactDestination = {
  label: string;
  value: string;
  hint: string;
  href: string;
  ariaLabel: string;
};

export const CONTACT_DESTINATIONS: readonly ContactDestination[] = [
  {
    label: 'WhatsApp',
    value: '+20 10 23066056',
    hint: 'Start a conversation',
    href: 'https://wa.me/201023066056',
    ariaLabel: 'Chat on WhatsApp: +20 10 23066056',
  },
  {
    label: 'Instagram',
    value: '@noouR_elgendy',
    hint: 'Follow / Connect',
    href: 'https://www.instagram.com/noourr_elgendy?stkn=MXZuc2gxNGNoZnM5Nw%3D%3D&utm_source=qr',
    ariaLabel: 'Open Instagram profile @noouR_elgendy in a new tab',
  },
] as const;

export type SocialLink = {
  id: 'whatsapp' | 'instagram';
  label: string;
  href: string;
  ariaLabel: string;
};

/** Social rail docked on the right side of the Contact destinations. */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/201023066056',
    ariaLabel: 'Chat on WhatsApp: +20 10 23066056 (opens in a new tab)',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/noourr_elgendy?stkn=MXZuc2gxNGNoZnM5Nw%3D%3D&utm_source=qr',
    ariaLabel: 'Open Instagram profile @noouR_elgendy in a new tab',
  },
] as const;
