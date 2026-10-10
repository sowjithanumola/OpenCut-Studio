import React from 'react';
import { useEditor } from '@/context/EditorContext';
import {
  MousePointer,
  Scissors,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize,
  Plus,
  Bookmark,
  Delete,
  Split
} from 'lucide-react';
import { ActiveTool } from '@/types/editor';

export const TimelineToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    snapping,
    setSnapping,
    rippleDelete,
    setRippleDelete,
    zoom,
    setZoom,
    splitClipAtPlayhead,
    addMarker,
    addTrack,
    selectedClipId,
    deleteClip
  } = useEditor();

  const handleFitTimeline = () => {
    setZoom(40);
  };

  return (
    <div className="h-9 bg-[#1a1c22] border-b border-[#2b303c] px-3 flex items-center justify-between gap-4 select-none shrink-0 text-xs">
      {/* Tool Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
            activeTool === 'select'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-neutral-400 hover:text-white hover:bg-[#222630]'
          }`}
          title="Selection Tool (V)"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select (V)</span>
        </button>

        <button
          onClick={() => setActiveTool('razor')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
            activeTool === 'razor'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-neutral-400 hover:text-white hover:bg-[#222630]'
          }`}
          title="Razor Split Tool (C)"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Razor (C)</span>
        </button>

        <span className="w-px h-4 bg-[#2b303c] mx-1" />

        {/* Razor Split at Playhead */}
        <button
          onClick={() => splitClipAtPlayhead()}
          className="flex items-center gap-1 px-2 py-1 text-neutral-300 hover:text-white hover:bg-[#222630] rounded transition-colors"
          title="Split clip at playhead (S)"
        >
          <Split className="w-3.5 h-3.5 text-cyan-400" />
          <span>Split</span>
        </button>

        {/* Delete selected */}
        {selectedClipId && (
          <button
            onClick={() => deleteClip(selectedClipId)}
            className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-[#222630] rounded transition-colors"
            title="Delete selected clip (Delete)"
          >
            <Delete className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}

        <span className="w-px h-4 bg-[#2b303c] mx-1" />

        {/* Snapping Magnet */}
        <button
          onClick={() => setSnapping(!snapping)}
          className={`p-1.5 rounded transition-colors ${
            snapping
              ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
          title={`Timeline Snapping: ${snapping ? 'ON' : 'OFF'} (Toggle: N)`}
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>

        {/* Ripple Delete Toggle */}
        <button
          onClick={() => setRippleDelete(!rippleDelete)}
          className={`px-2 py-1 text-[11px] rounded transition-colors ${
            rippleDelete
              ? 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
          title={`Ripple Delete: ${rippleDelete ? 'ON (shifts clips left)' : 'OFF'}`}
        >
          Ripple: {rippleDelete ? 'ON' : 'OFF'}
        </button>

        {/* Add Marker */}
        <button
          onClick={() => addMarker('Marker', '#06b6d4')}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222630] rounded transition-colors"
          title="Add Marker at playhead (M)"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Track & Zoom Controls */}
      <div className="flex items-center gap-3">
        {/* Add Track Menu */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => addTrack('video')}
            className="px-2 py-0.5 text-[11px] text-neutral-400 hover:text-white hover:bg-[#222630] rounded border border-[#2b303c] transition-colors"
            title="Add Video Track"
          >
            + Video Track
          </button>
          <button
            onClick={() => addTrack('audio')}
            className="px-2 py-0.5 text-[11px] text-neutral-400 hover:text-white hover:bg-[#222630] rounded border border-[#2b303c] transition-colors"
            title="Add Audio Track"
          >
            + Audio Track
          </button>
        </div>

        <span className="w-px h-4 bg-[#2b303c]" />

        {/* Zoom Slider */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(Math.max(15, zoom - 15))}
            className="p-1 text-neutral-400 hover:text-white"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="15"
            max="180"
            value={zoom}
            onChange={e => setZoom(parseInt(e.target.value, 10))}
            className="w-20 h-1 bg-[#2b303c] rounded"
            title={`Timeline Zoom: ${zoom}px/sec`}
          />

          <button
            onClick={() => setZoom(Math.min(180, zoom + 15))}
            className="p-1 text-neutral-400 hover:text-white"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFitTimeline}
            className="p-1 text-neutral-400 hover:text-white ml-1"
            title="Fit to Timeline"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
