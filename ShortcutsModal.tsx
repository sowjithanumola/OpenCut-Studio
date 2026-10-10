import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { setActiveModal } = useEditor();

  const shortcuts = [
    { category: 'Playback & Navigation', items: [
      { key: 'Space', desc: 'Play / Pause timeline' },
      { key: 'Left Arrow', desc: 'Step 1 frame backward' },
      { key: 'Right Arrow', desc: 'Step 1 frame forward' },
      { key: 'Home', desc: 'Jump to timeline start' },
      { key: 'End', desc: 'Jump to timeline end' },
    ]},
    { category: 'Editing Tools', items: [
      { key: 'V', desc: 'Activate Selection Tool' },
      { key: 'C', desc: 'Activate Razor / Split Tool' },
      { key: 'S', desc: 'Razor cut clip at playhead' },
      { key: 'Delete / Backspace', desc: 'Delete selected clip' },
      { key: 'Ctrl + D', desc: 'Duplicate selected clip' },
      { key: 'M', desc: 'Add timeline marker at playhead' },
    ]},
    { category: 'History & Workspace', items: [
      { key: 'Ctrl + Z', desc: 'Undo last action' },
      { key: 'Ctrl + Y / Shift+Ctrl+Z', desc: 'Redo last action' },
      { key: '+ / -', desc: 'Zoom In / Out on timeline' },
      { key: 'N', desc: 'Toggle timeline snapping' },
      { key: '?', desc: 'Open Keyboard Shortcuts' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-[#16181d] border border-[#2b303c] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1c1f26] border-b border-[#2b303c] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white">Keyboard Shortcuts Reference</span>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#222630]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5 text-xs text-neutral-300 max-h-[70vh] overflow-y-auto">
          {shortcuts.map(cat => (
            <div key={cat.category} className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {cat.category}
              </span>

              <div className="grid grid-cols-1 gap-1.5 bg-[#1b1e25] p-2.5 rounded border border-[#2b303c]">
                {cat.items.map(s => (
                  <div key={s.key} className="flex items-center justify-between py-1 px-1 border-b border-[#252a36] last:border-none">
                    <span className="text-neutral-300">{s.desc}</span>
                    <kbd className="px-2 py-0.5 bg-[#14161b] border border-[#373e4d] text-cyan-400 font-mono text-[11px] rounded shadow-sm">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
