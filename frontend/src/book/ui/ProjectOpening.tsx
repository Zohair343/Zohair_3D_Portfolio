import type { ReactNode } from 'react';
import type { Project } from '../../lib/content';
import { panelOf } from '../../lib/content';
import VideoPanel from './VideoPanel';
import { Cap } from './comic';

/** First page of every project: title, engine/genre tags, the video panel and the premise. */
/** `videoId` overrides the video panel's id when the lead panel's text also appears on the page (ids must be unique). */
export function ProjectOpening({ project, no, overlay, children, hidePremise = false, videoId }: { project: Project; no: number; overlay?: ReactNode; children?: ReactNode; hidePremise?: boolean; videoId?: string }) {
  const lead = project.panels[0];
  const media = project.media as { youtube?: string; clip?: string; poster: string; status: 'final' | 'development'; note?: string };
  return (
    <div className={`face face-project theme-${project.slug}`} style={{ ['--accent' as string]: project.accent, ['--accent-2' as string]: project.accent2 }}>
      <Cap>Project {no} of 4 · {project.engine}</Cap>
      <h2 className="project-title">{project.title}</h2>
      <p className="tags"><span className="tag">{project.genre}</span> <span className="tag">{project.engine}</span></p>
      <VideoPanel id={videoId ?? lead.id} title={project.title} poster={media.poster} youtube={media.youtube} clip={media.clip}
        status={media.status} note={media.note} posterAlt={`Inked illustration for ${project.title}.`}
        artOverlay={<>{overlay}<p className="caption-box art-caption">{panelOf(project, lead.id).caption}</p></>} />
      {project.links.length > 0 && (
        <p className="watch-links">{(project.links as { label: string; url: string }[]).map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
        ))}</p>
      )}
      {!hidePremise && <p className="premise">{project.premise}</p>}
      {children}
    </div>
  );
}
