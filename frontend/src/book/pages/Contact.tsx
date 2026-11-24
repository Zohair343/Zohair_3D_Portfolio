import LetterForm from '../ui/LetterForm';
import { PageTitle } from '../ui/comic';

export function ContactPage() {
  return (
    <div className="face face-contact">
      <PageTitle kicker="Back of the book" title="Write to the author" />
      <LetterForm />
    </div>
  );
}
