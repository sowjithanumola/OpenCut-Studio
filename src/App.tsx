import React, { useEffect } from 'react';
import { EditorProvider, useEditor } from '@/context/EditorContext';
import { Header } from '@/components/layout/Header';
import { MediaPanel } from '@/components/layout/MediaPanel';
import { PreviewMonitor } from '@/components/layout/PreviewMonitor';
import { InspectorPanel } from '@/components/layout/InspectorPanel';
import { TimelineContainer } from '@/components/timeline/TimelineContainer';
import { ExportModal } from '@/components/modals/ExportModal';
import { AIModal } from '@/components/modals/AIModal';
import { ProjectsModal } from '@/components/modals/ProjectsModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';

const EditorLayout: React.FC = () => {
  const {
    togglePlay,
    stepFrame,
    jumpToStart,
    jumpToEnd,
    setActiveTool,
    splitClipAtPlayhead,
    selectedClipId,
    deleteClip,
    undo,
    redo,
    snapping,
    setSnapping,
    activeModal,
    setActiveModal
  } = useEditor();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Space: Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Arrow keys: Step frame
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepFrame(1);
        return;
      }

      // Home / End: Jump start / end
      if (e.key === 'Home') {
        e.preventDefault();
        jumpToStart();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        jumpToEnd();
        return;
      }

      // Tool switches: V (select), C (razor)
      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        setActiveTool('razor');
        return;
      }

      // Split at playhead: S
      if (e.key === 's' || e.key === 'S') {
        splitClipAtPlayhead();
        return;
      }

      // Delete selected clip: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          deleteClip(selectedClipId);
        }
        return;
      }

      // Snapping toggle: N
      if (e.key === 'n' || e.key === 'N') {
        setSnapping(!snapping);
        return;
      }

      // Shortcuts Modal: ?
      if (e.key === '?') {
        setActiveModal('shortcuts');
        return;
      }

      // Undo / Redo: Ctrl+Z / Cmd+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    stepFrame,
    jumpToStart,
    jumpToEnd,
    setActiveTool,
    splitClipAtPlayhead,
    selectedClipId,
    deleteClip,
    undo,
    redo,
    snapping,
    setSnapping,
    setActiveModal
  ]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#0f1013] text-neutral-100 font-sans">
      {/* Top Professional Header */}
      <Header />

      {/* Main Workspace (Media Panel | Preview Monitor | Inspector Panel) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <MediaPanel />
        <PreviewMonitor />
        <InspectorPanel />
      </div>

      {/* Multitrack Non-Linear Timeline */}
      <TimelineContainer />

      {/* Modals */}
      {activeModal === 'export' && <ExportModal />}
      {activeModal === 'ai' && <AIModal />}
      {activeModal === 'projects' && <ProjectsModal />}
      {activeModal === 'shortcuts' && <ShortcutsModal />}
    </div>
  );
};

export default function App() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}
