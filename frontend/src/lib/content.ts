import portfolio from '@content/portfolio.json';

export type Panel = { id: string; kind: string; title: string; caption: string; body: string; sfx?: string };
export type Project = (typeof portfolio.projects)[number] & { panels: Panel[] };
export const content = portfolio;
export const projects = portfolio.projects as Project[];
export const projectBySlug = (slug?: string) => projects.find((p) => p.slug === slug);
export const panelOf = (p: Project, id: string) => p.panels.find((x) => x.id === id)!;
