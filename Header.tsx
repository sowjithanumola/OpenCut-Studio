import React from 'react';
import { useEditor } from '../context/EditorContext';
import {
  FolderOpen,
  Undo2,
  Redo2,
  Sparkles,
  Download,
  HelpCircle,
  Save,
  CheckCircle2,
  Film
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    project,
    canUndo,
    canRedo,
    undo,
    redo,
    saveStatus,
    saveCurrentProject,
    setActiveModal
  } = useEditor();

  return (
    <header className="h-12 bg-[#16181d] border-b border-[#2b303c] px-4 flex items-center justify-between gap-8 select-none shrink-0 z-20">
      {/* Zone 1: Single text wordmark & project info */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="font-bold text-sm tracking-wide text-white whitespace-nowrap">
            OpenCut Studio
          </span>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden sm:inline" aria-hidden="true">|</span>

        <button
          onClick={() => setActiveModal('projects')}
          className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors py-1 px-2 rounded hover:bg-[#222630] whitespace-nowrap shrink-0"
          title="Open Project Manager"
        >
          <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-medium truncate max-w-[140px]">{project.name}</span>
        </button>

        <span className="text-xs text-neutral-500 hidden md:inline">
          {project.settings.resolution.width}×{project.settings.resolution.height} · {project.settings.fps}fps
        </span>
      </div>

      {/* Zone 2: Navigation & Quick Edit Affordances */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 text-neutral-400 hover:text-white disabled:text-neutral-600 hover:bg-[#222630] rounded transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 text-neutral-400 hover:text-white disabled:text-neutral-600 hover:bg-[#222630] rounded transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-[#2b303c] mx-1" />

        {/* AI Magic Assistant */}
        <button
          onClick={() => setActiveModal('ai')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/50 rounded transition-colors whitespace-nowrap shrink-0"
          title="AI Captions, Titles & Edit Suggestions"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Magic</span>
        </button>

        {/* Shortcuts */}
        <button
          onClick={() => setActiveModal('shortcuts')}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222630] rounded transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Save Status */}
        <button
          onClick={saveCurrentProject}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded hover:bg-[#222630] transition-colors"
          title="Click to force save"
        >
          {saveStatus === 'saving' ? (
            <span className="text-[11px] text-amber-400">Saving...</span>
          ) : saveStatus === 'unsaved' ? (
            <div className="flex items-center gap-1">
              <Save className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px] text-neutral-400">Unsaved</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
              <CheckCircle2 className="w-3 h-3 text-cyan-500/80" />
              <span>Saved</span>
            </div>
          )}
        </button>
      </div>

      {/* Zone 3: Primary Action (Export Video) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActiveModal('export')}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-cyan-400 hover:bg-cyan-300 rounded shadow-sm hover:shadow transition-all whitespace-nowrap shrink-0 active:scale-[0.98]"
        >
          <Download className="w-4 h-4 stroke-[2.2]" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
