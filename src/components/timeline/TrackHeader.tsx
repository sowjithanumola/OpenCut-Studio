import React from 'react';
import { TimelineTrack } from '@/types/editor';
import { useEditor } from '@/context/EditorContext';
import {
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2
} from 'lucide-react';

interface TrackHeaderProps {
  track: TimelineTrack;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({ track }) => {
  const {
    toggleTrackMute,
    toggleTrackHide,
    toggleTrackLock,
    deleteTrack,
    project
  } = useEditor();

  return (
    <div className="h-14 bg-[#181a20] border-b border-[#2b303c] px-2.5 flex items-center justify-between select-none shrink-0 text-xs">
      {/* Track Label */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          track.type === 'video' ? 'bg-sky-400' :
          track.type === 'audio' ? 'bg-emerald-400' : 'bg-amber-400'
        }`} />
        <span className="font-medium text-neutral-200 truncate text-[11px]" title={track.name}>
          {track.name}
        </span>
      </div>

      {/* Track Toggles */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Hide / Show */}
        <button
          onClick={() => toggleTrackHide(track.id)}
          className={`p-1 rounded transition-colors ${
            track.hidden ? 'text-red-400 bg-red-950/30' : 'text-neutral-400 hover:text-white'
          }`}
          title={track.hidden ? 'Show Track' : 'Hide Track'}
        >
          {track.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>

        {/* Mute */}
        <button
          onClick={() => toggleTrackMute(track.id)}
          className={`p-1 rounded transition-colors ${
            track.muted ? 'text-red-400 bg-red-950/30' : 'text-neutral-400 hover:text-white'
          }`}
          title={track.muted ? 'Unmute Track' : 'Mute Track'}
        >
          {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </button>

        {/* Lock */}
        <button
          onClick={() => toggleTrackLock(track.id)}
          className={`p-1 rounded transition-colors ${
            track.locked ? 'text-amber-400 bg-amber-950/30' : 'text-neutral-400 hover:text-white'
          }`}
          title={track.locked ? 'Unlock Track' : 'Lock Track'}
        >
          {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>

        {/* Delete Track (if more than 1 track of this type) */}
        {project.tracks.length > 2 && (
          <button
            onClick={() => deleteTrack(track.id)}
            className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors"
            title="Delete Track"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
