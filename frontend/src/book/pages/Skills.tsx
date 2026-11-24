import { useNavigate } from 'react-router-dom';
import { content } from '../../lib/content';
import { PageTitle } from '../ui/comic';

/** Skills with evidence open the panel where the skill is used. */
export function SkillsPage() {
  const navigate = useNavigate();
  return (
    <div className="face face-skills">
      <PageTitle kicker="Chapter 2" title="Inventory" />
      <p className="lede">Skills marked <span className="chip chip-link mini">see it →</span> open the panel where I used them.</p>
      {content.skills.groups.map((g) => (
        <section key={g.id} id={`skills-${g.id}`} className="skill-group" aria-labelledby={`sg-${g.id}`}>
          <h3 id={`sg-${g.id}`}>{g.title}</h3>
          <ul className="chips">
            {g.items.map((it) => (
              <li key={it.name}>
                {'evidence' in it && it.evidence
                  ? <button className="chip chip-link" onClick={() => navigate(it.evidence!)}>{it.name} <span className="chip-evidence">see it →</span></button>
                  : <span className="chip">{it.name}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
