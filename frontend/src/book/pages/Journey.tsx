import { content, projects } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { Cap, PageTitle } from '../ui/comic';

const { journey } = content;

export function Journey1() {
  const [ned, ...earlier] = journey.education;
  return (
    <div className="face face-journey">
      <PageTitle kicker="Chapter 4" title="The journey" />
      <section id="ned" className="bpanel" aria-labelledby="ned-h">
        <div className="bpanel-body">
          <Cap small>{ned.period}</Cap>
          <h3 id="ned-h">{ned.title}</h3>
          <p className="org">{ned.org} · {ned.detail}</p>
          <h4>Relevant coursework</h4>
          <ul className="course-list">{ned.coursework?.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </section>
      <details id="earlier-education" className="bpanel earlier">
        <summary>Earlier qualifications</summary>
        <ul>{earlier.map((e) => <li key={e.id} id={e.id}><strong>{e.title}</strong> — {e.org}. {e.detail}</li>)}</ul>
      </details>
    </div>
  );
}

export function Journey2({ book }: PageProps) {
  return (
    <div className="face face-journey">
      {journey.achievements.map((a) => (
        <section key={a.id} id={a.id} className={`bpanel achievement ${a.type}`} aria-labelledby={`${a.id}-h`}>
          {a.type === 'award' ? <span className="rosette" aria-hidden="true"><span>RUNNER</span><span>UP</span></span> : <span className="stamp" aria-hidden="true">Participant</span>}
          <div className="bpanel-body">
            <p className="tag">{a.type === 'award' ? 'Award' : 'Participation'} · {a.place}</p>
            <h3 id={`${a.id}-h`}>{a.title}</h3>
            <p>{a.body}</p>
          </div>
        </section>
      ))}
      <section id={journey.experience.id} className="bpanel" aria-labelledby="xp-h">
        <div className="bpanel-body">
          <Cap small>Practical project experience</Cap>
          <h3 id="xp-h">{journey.experience.title}</h3>
          <p>{journey.experience.body}</p>
          <ul className="xp-list">{projects.map((p) => <li key={p.slug}><button className="linklike" onClick={() => book.goTo(`${p.slug}-1`)}>{p.title}</button> — {p.genre}</li>)}</ul>
        </div>
      </section>
    </div>
  );
}
