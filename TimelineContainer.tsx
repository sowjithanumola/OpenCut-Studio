import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TrackHeader } from './TrackHeader';
import { TimelineClipView } from './TimelineClipView';
import { PlayheadView } from './PlayheadView';

export const TimelineContainer: React.FC = () => {
  const {
    project,
    zoom,
    mediaAssets,
    setSelectedClipId,
    setPlayhead,
    activeTool,
    splitClipAtPlayhead
  } = useEditor();

  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const totalWidth = Math.max(1200, project.duration * zoom + 300);
  const trackHeight = 56; // 56px per track (h-14)
  const totalTimelineHeight = project.tracks.length * trackHeight + 30;

  const handleTracksScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const handleTrackLaneClick = (trackId: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle]') || (e.target as HTMLElement).closest('.cursor-grab')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left + (tracksScrollRef.current?.scrollLeft || 0);
    const targetTime = Math.max(0, clickX / zoom);

    setPlayhead(targetTime);
    setSelectedClipId(null);
  };

  return (
    <div className="h-72 bg-[#121316] border-t border-[#2b303c] flex flex-col select-none shrink-0 z-10">
      {/* Top Timeline Toolbar */}
      <TimelineToolbar />

      {/* Multitrack Workspace Split: Left Headers vs Right Scrollable Lanes */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Fixed Track Headers */}
        <div className="w-52 bg-[#16181d] border-r border-[#2b303c] flex flex-col shrink-0 overflow-y-hidden z-20 shadow-md">
          {/* Header empty space matching ruler height */}
          <div className="h-6 bg-[#1a1c22] border-b border-[#2b303c] px-3 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
            <span>TRACKS</span>
            <span className="font-mono text-[9px] text-neutral-500">M / V / L</span>
          </div>

          {/* Track Headers list */}
          <div className="flex-1 overflow-y-auto">
            {project.tracks.map(track => (
              <TrackHeader key={track.id} track={track} />
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          ref={tracksScrollRef}
          onScroll={handleTracksScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0f1013]"
        >
          {/* Time Ruler */}
          <div className="sticky top-0 z-20">
            <TimelineRuler scrollLeft={scrollLeft} />
          </div>

          {/* Tracks Area */}
          <div
            className="relative"
            style={{
              width: `${totalWidth}px`,
              minHeight: `${project.tracks.length * trackHeight}px`
            }}
          >
            {/* Playhead Overlay */}
            <PlayheadView timelineHeight={totalTimelineHeight} />

            {/* Track Lanes */}
            {project.tracks.map((track, trackIdx) => (
              <div
                key={track.id}
                onClick={(e) => handleTrackLaneClick(track.id, e)}
                className={`h-14 border-b border-[#232731] relative ${
                  trackIdx % 2 === 0 ? 'bg-[#121418]' : 'bg-[#101215]'
                } ${track.locked ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {/* Track Center Line Guide */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#1c1f26] pointer-events-none" />

                {/* Clips belonging to this track */}
                {project.clips
                  .filter(c => c.trackId === track.id)
                  .map(clip => {
                    const asset = clip.assetId
                      ? mediaAssets.find(a => a.id === clip.assetId)
                      : undefined;
                    return (
                      <TimelineClipView
                        key={clip.id}
                        clip={clip}
                        mediaAsset={asset}
                      />
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
