import React, { useRef, useCallback } from 'react';
import { useEditor } from '../../context/EditorContext';

interface PlayheadViewProps {
  timelineHeight: number;
}

export const PlayheadView: React.FC<PlayheadViewProps> = ({ timelineHeight }) => {
  const { playhead, setPlayhead, zoom } = useEditor();
  const playheadRef = useRef<HTMLDivElement>(null);

  const leftPx = playhead * zoom;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const handle = playheadRef.current;
    if (!handle) return;

    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const initialTime = playhead;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const targetTime = Math.max(0, initialTime + deltaPx / zoom);
      setPlayhead(targetTime);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      handle.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [playhead, setPlayhead, zoom]);

  return (
    <div
      ref={playheadRef}
      onPointerDown={handlePointerDown}
      className="absolute top-0 z-30 pointer-events-auto cursor-ew-resize select-none"
      style={{
        left: `${leftPx}px`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Top Handle / Scrubber Head */}
      <div className="w-3.5 h-4 bg-cyan-400 rounded-b shadow-md flex items-center justify-center">
        <div className="w-0.5 h-2 bg-neutral-900 rounded-full" />
      </div>

      {/* Vertical Needle Line */}
      <div
        className="w-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] mx-auto"
        style={{ height: `${timelineHeight}px` }}
      />
    </div>
  );
};
