/**
 * Site metadata that is used across the site.
 */
export const SITE_METADATA = {
  title: 'Ryan Dsouza',
  headerTitle: 'Hey 👋',
  description: 'A blog created with Astro and Tailwind.css',
  language: 'en-us',
  theme: 'system', // Options: system, light, dark
  siteUrl: 'https://www.ryan17.dev/',
  siteRepo: 'https://github.com/wanoo21/tailwind-astro-starting-blog',
  socialBanner: '/static/images/twitter-card.png',
  locale: 'en-US',

  // socials
  email: 'contact@ryan17.dev',
  github: 'https://github.com/ryands17/',
  twitter: 'https://twitter.com/ryands1701/',
  linkedin: 'https://www.linkedin.com/in/ryan-dsouza-880522125/',
  // youtube: 'https://youtube.com',
};

/**
 * Default posts per page for pagination.
 */
export const ITEMS_PER_PAGE = 5;

export const NAVIGATION = [
  { href: '/', title: 'Home' },
  { href: '/blog', title: 'Blog' },
  { href: '/tags', title: 'Tags' },
];
