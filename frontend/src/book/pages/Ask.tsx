import ChatBox from '../ui/ChatBox';
import { PageTitle } from '../ui/comic';
import { avatarConfig } from '../../avatar/config';

export function AskPage() {
  return (
    <div className="face face-ask">
      <div className="ask-head">
        <img className="ask-portrait" src={avatarConfig.portrait} alt="" width={120} height={120} />
        <PageTitle kicker="Chapter 6 · AI guide" title="Ask Zohair" />
      </div>
      <p className="small muted">Answers come only from this portfolio, with links to the panel they used. Don’t include personal information.</p>
      <ChatBox />
    </div>
  );
}
