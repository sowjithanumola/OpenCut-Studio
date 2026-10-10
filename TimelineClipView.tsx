import React, { useRef, useState, useCallback } from 'react';
import { TimelineClip, MediaAsset } from '../../types/editor';
import { useEditor } from '../../context/EditorContext';
import { Video, Music, Type, Image as ImageIcon, Palette } from 'lucide-react';

interface TimelineClipViewProps {
  clip: TimelineClip;
  mediaAsset?: MediaAsset;
}

export const TimelineClipView: React.FC<TimelineClipViewProps> = ({ clip, mediaAsset }) => {
  const {
    zoom,
    selectedClipId,
    setSelectedClipId,
    activeTool,
    splitClipAtPlayhead,
    moveClip,
    trimClip,
    setPlayhead
  } = useEditor();

  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<'start' | 'end' | null>(null);

  const isSelected = selectedClipId === clip.id;
  const leftPx = clip.startTime * zoom;
  const widthPx = Math.max(14, clip.duration * zoom);

  // Type-based styling
  const getThemeStyles = () => {
    switch (clip.type) {
      case 'video':
        return 'bg-[#1a2d42] border-[#2b5278] text-sky-200';
      case 'audio':
        return 'bg-[#153424] border-[#23583d] text-emerald-200';
      case 'text':
        return 'bg-[#3b2d13] border-[#6b5220] text-amber-200';
      case 'color':
        return 'bg-[#341b46] border-[#5e2e80] text-purple-200';
      default:
        return 'bg-[#222630] border-[#3b4252] text-neutral-200';
    }
  };

  // Drag Clip Repositioning
  const handlePointerDown = (e: React.PointerEvent) => {
    // If Razor tool is active, split here
    if (activeTool === 'razor') {
      e.stopPropagation();
      const rect = clipRef.current?.getBoundingClientRect();
      if (rect) {
        const offsetPx = e.clientX - rect.left;
        const targetTime = clip.startTime + (offsetPx / zoom);
        setPlayhead(targetTime);
        splitClipAtPlayhead(clip.id);
      }
      return;
    }

    // Select clip
    setSelectedClipId(clip.id);

    // If click is on a trim handle, handled by handleTrimPointerDown
    if ((e.target as HTMLElement).dataset.handle) return;

    e.stopPropagation();
    const startX = e.clientX;
    const initialStartTime = clip.startTime;
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;
      moveClip(clip.id, initialStartTime + deltaSec);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Trimming Start or End
  const handleTrimPointerDown = (edge: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    setIsTrimming(edge);
    const startX = e.clientX;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;
      trimClip(clip.id, edge, deltaSec);
    };

    const handlePointerUp = () => {
      setIsTrimming(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={clipRef}
      onPointerDown={handlePointerDown}
      className={`absolute top-1 bottom-1 rounded border select-none overflow-hidden transition-shadow flex flex-col justify-between ${getThemeStyles()} ${
        isSelected ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-lg z-10' : 'hover:border-neutral-400 z-0'
      } ${isDragging ? 'opacity-80 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`
      }}
    >
      {/* Clip Header Label */}
      <div className="px-1.5 py-0.5 flex items-center justify-between text-[11px] font-medium leading-tight truncate z-10 bg-black/25">
        <div className="flex items-center gap-1 truncate min-w-0">
          {clip.type === 'video' ? <Video className="w-3 h-3 text-cyan-400 shrink-0" /> :
           clip.type === 'audio' ? <Music className="w-3 h-3 text-emerald-400 shrink-0" /> :
           clip.type === 'text' ? <Type className="w-3 h-3 text-amber-400 shrink-0" /> :
           <Palette className="w-3 h-3 text-purple-400 shrink-0" />}
          <span className="truncate">{clip.name}</span>
        </div>

        <span className="font-mono text-[10px] text-white/70 ml-1 shrink-0 tabular-nums">
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Waveform Visualization (for Audio & Video clips) */}
      {mediaAsset?.waveform && (
        <div className="flex-1 px-1 flex items-center justify-between gap-0.5 opacity-60 overflow-hidden pointer-events-none">
          {mediaAsset.waveform.slice(0, Math.min(80, Math.floor(widthPx / 4))).map((peak, idx) => (
            <div
              key={idx}
              className="w-1 bg-current rounded-full"
              style={{ height: `${Math.max(15, peak * 80)}%` }}
            />
          ))}
        </div>
      )}

      {/* Text preview if text clip */}
      {clip.type === 'text' && clip.text && (
        <div className="flex-1 px-2 flex items-center text-[10px] text-amber-200/90 truncate pointer-events-none italic font-serif">
          "{clip.text.content}"
        </div>
      )}

      {/* Transition indicators */}
      <div className="absolute bottom-0.5 left-1 right-1 flex justify-between text-[9px] pointer-events-none text-white/50">
        {clip.transitionIn && clip.transitionIn.type !== 'none' && (
          <span className="bg-cyan-900/60 px-1 rounded text-cyan-300">
            {clip.transitionIn.type}
          </span>
        )}
        {clip.transitionOut && clip.transitionOut.type !== 'none' && (
          <span className="bg-cyan-900/60 px-1 rounded text-cyan-300 ml-auto">
            {clip.transitionOut.type}
          </span>
        )}
      </div>

      {/* Left Trim Handle */}
      <div
        data-handle="start"
        onPointerDown={(e) => handleTrimPointerDown('start', e)}
        className="absolute top-0 bottom-0 left-0 w-2 hover:w-3 bg-white/0 hover:bg-cyan-400/80 cursor-ew-resize transition-all z-20"
        title="Drag to trim start"
      />

      {/* Right Trim Handle */}
      <div
        data-handle="end"
        onPointerDown={(e) => handleTrimPointerDown('end', e)}
        className="absolute top-0 bottom-0 right-0 w-2 hover:w-3 bg-white/0 hover:bg-cyan-400/80 cursor-ew-resize transition-all z-20"
        title="Drag to trim end"
      />
    </div>
  );
};
