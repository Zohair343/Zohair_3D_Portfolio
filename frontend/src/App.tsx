import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MediaProvider } from './components/MediaCoordinator';
import { PAGES, TABS } from './book/book.config';
import ReadingMode from './book/ReadingMode';

const Book = lazy(() => import('./book/engine/Book'));
const RigLab = lazy(() => import('./pages/RigLab'));
const PortraitLab = lazy(() => import('./pages/PortraitLab'));

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** If the 3D book crashes, fall back to reading mode instead of a blank screen. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ReadingMode notice="The 3D book couldn’t start on this device, so here are the same pages flat." /> : this.props.children; }
}

export default function App() {
  const [webgl] = useState(hasWebGL);
  return (
    <MediaProvider>
      <Routes>
        <Route path="/lab/rig" element={<Suspense fallback={null}><RigLab /></Suspense>} />
        <Route path="/lab/portrait" element={<Suspense fallback={null}><PortraitLab /></Suspense>} />
        <Route path="/read" element={<ReadingMode />} />
        <Route path="*" element={
          webgl ? (
            <Fallback>
              <Suspense fallback={<p className="book-opening">Opening the book…</p>}>
                <Book pages={PAGES} tabs={TABS} />
              </Suspense>
            </Fallback>
          ) : <ReadingMode notice="This device can’t show 3D, so here is the book in reading mode." />
        } />
      </Routes>
    </MediaProvider>
  );
}
