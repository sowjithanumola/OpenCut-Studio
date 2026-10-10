import React, { useRef, useCallback } from 'react';
import { useEditor } from '@/context/EditorContext';

interface TimelineRulerProps {
  scrollLeft: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ scrollLeft }) => {
  const { project, playhead, setPlayhead, zoom } = useEditor();
  const rulerRef = useRef<HTMLDivElement>(null);

  const totalWidth = Math.max(1200, project.duration * zoom + 300);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ruler = rulerRef.current;
    if (!ruler) return;

    ruler.setPointerCapture(e.pointerId);

    const updatePlayheadFromEvent = (clientX: number) => {
      const rect = ruler.getBoundingClientRect();
      const clickX = clientX - rect.left + ruler.scrollLeft;
      const targetTime = Math.max(0, clickX / zoom);
      setPlayhead(targetTime);
    };

    updatePlayheadFromEvent(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePlayheadFromEvent(moveEvent.clientX);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      ruler.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [setPlayhead, zoom]);

  // Determine tick interval based on zoom level
  const intervalSeconds = zoom < 25 ? 5 : zoom < 60 ? 2 : 1;
  const numIntervals = Math.ceil(project.duration / intervalSeconds) + 5;

  const ticks = [];
  for (let i = 0; i < numIntervals; i++) {
    const sec = i * intervalSeconds;
    const x = sec * zoom;
    ticks.push({ sec, x });
  }

  const formatRulerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      className="h-6 bg-[#16181d] border-b border-[#2b303c] relative overflow-hidden select-none cursor-ew-resize shrink-0"
      style={{ width: `${totalWidth}px` }}
    >
      {/* Time Ticks */}
      {ticks.map(({ sec, x }) => (
        <div
          key={sec}
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-between"
          style={{ left: `${x}px` }}
        >
          <span className="text-[10px] text-neutral-400 font-mono pl-1 pt-0.5 tabular-nums">
            {formatRulerTime(sec)}
          </span>
          <div className="w-px h-2 bg-[#3f4756]" />
        </div>
      ))}

      {/* Minor Sub-second ticks if high zoom */}
      {zoom >= 60 && ticks.map(({ sec, x }) => (
        <React.Fragment key={`sub_${sec}`}>
          <div
            className="absolute bottom-0 w-px h-1 bg-[#2b303c] pointer-events-none"
            style={{ left: `${x + zoom * 0.25}px` }}
          />
          <div
            className="absolute bottom-0 w-px h-1.5 bg-[#343b49] pointer-events-none"
            style={{ left: `${x + zoom * 0.5}px` }}
          />
          <div
            className="absolute bottom-0 w-px h-1 bg-[#2b303c] pointer-events-none"
            style={{ left: `${x + zoom * 0.75}px` }}
          />
        </React.Fragment>
      ))}

      {/* Timeline Markers */}
      {project.markers.map(marker => (
        <div
          key={marker.id}
          className="absolute top-0 h-full flex items-center z-10 pointer-events-none"
          style={{ left: `${marker.time * zoom}px` }}
          title={`${marker.label} (${marker.time.toFixed(1)}s)`}
        >
          <div
            className="w-2.5 h-2.5 rounded-full border border-black shadow-sm -ml-1.5"
            style={{ backgroundColor: marker.color }}
          />
        </div>
      ))}
    </div>
  );
};
