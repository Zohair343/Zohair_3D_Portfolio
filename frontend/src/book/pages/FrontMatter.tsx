import { content, projects } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { Balloon, PageTitle, Speech } from '../ui/comic';

/* Cover and contents. */

export function CoverPage({ book }: PageProps) {
  const { profile } = content;
  return (
    <div className="face face-cover">
      <div className="cv-mast"><span>Issue #1</span><strong>Playable Pages</strong><span>Karachi ed.</span></div>
      <div className="cv-body">
        <p className="cv-role">{profile.role} · {profile.location}</p>
        <h1 className="cv-name">Muhammad<br />Zohair<br />Shaikh</h1>
        <p className="cv-intro">{profile.intro}</p>
        <Speech className="cv-speech">Hi! Open the book and I’ll show you how my games work.</Speech>
        <Balloon onClick={() => book.goTo('contents')} tail="right">Open the book →</Balloon>
      </div>
      <div className="cv-lower" aria-hidden="true" />
    </div>
  );
}

export function ContentsPage({ book }: PageProps) {
  const rows: [string, string, string][] = [
    ['About me', 'who’s holding the pen', 'about'],
    ['Skills', 'the inventory', 'skills'],
    ...projects.map((p) => [p.title, `${p.engine} · ${p.genre}`, `${p.slug}-1`] as [string, string, string]),
    ['The journey', 'NED · game jams', 'journey-1'],
    ['Portfolio film', '45 seconds', 'film'],
    ['Ask Zohair', 'talk to the avatar', 'ask'],
    ['Write to the author', 'contact', 'contact'],
  ];
  return (
    <div className="face">
      <PageTitle kicker="Inside cover" title="Contents" />
      <ol className="toc">
        {rows.map(([t, s, id]) => (
          <li key={id}><button onClick={() => book.goTo(id)}><b>{t}</b><span>{s}</span></button></li>
        ))}
      </ol>
    </div>
  );
}
