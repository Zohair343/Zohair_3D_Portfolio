import { avatarConfig } from '../../avatar/config';
import type { PageProps } from '../engine/types';
import { Balloon, PageTitle } from '../ui/comic';

/** Inside back cover. The fine print is required: CC BY 4.0 needs the character model credited wherever it is shown. */
export function CreditsPage({ book }: PageProps) {
  const c = avatarConfig.credit;
  return (
    <div className="face face-credits">
      <div className="credits-end">
        <PageTitle title="Thanks for reading" />
        <Balloon onClick={() => book.goTo('cover')} tail="left">← Close the book</Balloon>
      </div>
      <p className="fine-print">
        Character: “<a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a>” by {c.author}, <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a>; modified (re-posed and animated in code).
      </p>
    </div>
  );
}
