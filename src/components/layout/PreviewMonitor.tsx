import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditor } from '@/context/EditorContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  Grid
} from 'lucide-react';
import { renderCompositionFrame, prepareRenderMedia } from '@/services/exportEngine';

export const PreviewMonitor: React.FC = () => {
  const {
    project,
    playhead,
    isPlaying,
    togglePlay,
    stepFrame,
    jumpToStart,
    jumpToEnd,
    playbackSpeed,
    setPlaybackSpeed,
    mediaAssets
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSafeMargins, setShowSafeMargins] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [vuLevel, setVuLevel] = useState<number>(0);

  // Cached media elements
  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioNodesRef = useRef<Map<string, { source: AudioBufferSourceNode; gain: GainNode }>>(new Map());
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialize AudioContext
  useEffect(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx && !audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
  }, []);

  // Pre-load media elements
  useEffect(() => {
    let active = true;
    prepareRenderMedia(project, mediaAssets).then(res => {
      if (active) {
        mediaElementsRef.current = res.mediaElements;
        audioBuffersRef.current = res.audioBuffers;
      }
    });
    return () => { active = false; };
  }, [project, mediaAssets]);

  // Audio Playback Synchronization
  useEffect(() => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    // Stop currently running audio sources
    activeAudioNodesRef.current.forEach(({ source, gain }) => {
      try {
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch {}
    });
    activeAudioNodesRef.current.clear();

    if (!isPlaying || isMuted || masterVolume === 0) {
      setVuLevel(0);
      return;
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    let activeVolumeSum = 0;

    // Start audio sources for active clips
    for (const clip of project.clips) {
      if (clip.audio.mute) continue;
      const track = project.tracks.find(t => t.id === clip.trackId);
      if (!track || track.muted || track.volume === 0) continue;

      // Check if clip is active at current playhead
      if (playhead >= clip.startTime && playhead < clip.startTime + clip.duration) {
        if (!clip.assetId) continue;
        const buffer = audioBuffersRef.current.get(clip.assetId);
        if (!buffer) continue;

        try {
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = (clip.speed || 1.0) * playbackSpeed;

          const gain = audioCtx.createGain();
          const clipVol = (clip.audio.volume ?? 1.0) * (track.volume ?? 1.0) * masterVolume;
          gain.gain.value = clipVol;

          source.connect(gain);
          gain.connect(audioCtx.destination);

          const clipOffset = (playhead - clip.startTime) * clip.speed + clip.trimStart;
          const durationLeft = (clip.duration - (playhead - clip.startTime));

          if (durationLeft > 0 && clipOffset < buffer.duration) {
            source.start(0, clipOffset, durationLeft);
            activeAudioNodesRef.current.set(clip.id, { source, gain });
            activeVolumeSum += clipVol;
          }
        } catch (err) {
          console.warn('Audio sync play error:', err);
        }
      }
    }

    setVuLevel(Math.min(1.0, activeVolumeSum * 0.7));

    return () => {
      activeAudioNodesRef.current.forEach(({ source, gain }) => {
        try {
          source.stop();
          source.disconnect();
          gain.disconnect();
        } catch {}
      });
      activeAudioNodesRef.current.clear();
    };
  }, [isPlaying, playhead, isMuted, masterVolume, playbackSpeed, project]);

  // Main Render Frame Trigger
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = project.settings.resolution;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    renderCompositionFrame(ctx, width, height, project, playhead, mediaElementsRef.current, mediaAssets);

    // Safe margins overlay
    if (showSafeMargins) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      // 90% Action Safe
      const actionW = width * 0.9;
      const actionH = height * 0.9;
      ctx.strokeRect((width - actionW) / 2, (height - actionH) / 2, actionW, actionH);

      // 80% Title Safe
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
      const titleW = width * 0.8;
      const titleH = height * 0.8;
      ctx.strokeRect((width - titleW) / 2, (height - titleH) / 2, titleW, titleH);

      // Center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(width / 2 - 20, height / 2);
      ctx.lineTo(width / 2 + 20, height / 2);
      ctx.moveTo(width / 2, height / 2 - 20);
      ctx.lineTo(width / 2, height / 2 + 20);
      ctx.stroke();

      ctx.restore();
    }
  }, [project, playhead, mediaAssets, showSafeMargins]);

  // Format Timecode: HH:MM:SS:FF
  const formatTimecode = (seconds: number, fps: number = 30) => {
    const totalFrames = Math.floor(seconds * fps);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = totalFrames % fps;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full bg-[#0d0e12] flex flex-col min-w-0 select-none relative"
    >
      {/* Top Monitor Status Bar */}
      <div className="h-8 bg-[#14161b] border-b border-[#2b303c] px-3 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="font-medium text-neutral-200">Program Monitor</span>
          <span className="text-[11px] text-neutral-500 font-mono">
            {project.settings.resolution.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Safe Margins Toggle */}
          <button
            onClick={() => setShowSafeMargins(prev => !prev)}
            className={`p-1 rounded transition-colors ${
              showSafeMargins ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40' : 'text-neutral-400 hover:text-white'
            }`}
            title="Toggle Safe Margins (Title/Action Safe)"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
            title="Fullscreen Preview"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex-1 relative flex items-center justify-center p-3 overflow-hidden bg-[#090a0d]">
        <div className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded overflow-hidden border border-[#1f222a]">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[calc(100vh-320px)] object-contain block bg-black"
          />
        </div>
      </div>

      {/* Transport & Playback Control Bar */}
      <div className="h-12 bg-[#16181d] border-t border-[#2b303c] px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Timecode display */}
        <div className="flex items-center gap-2 font-mono text-xs tabular-nums shrink-0">
          <span className="text-cyan-400 font-bold bg-[#1e222b] px-2 py-1 rounded border border-[#2b303c]">
            {formatTimecode(playhead, project.settings.fps)}
          </span>
          <span className="text-neutral-500">/</span>
          <span className="text-neutral-400">
            {formatTimecode(project.duration, project.settings.fps)}
          </span>
        </div>

        {/* Center Playback Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={jumpToStart}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222630] rounded transition-colors"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222630] rounded transition-colors"
            title="Step 1 Frame Back (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="p-2 text-neutral-900 bg-cyan-400 hover:bg-cyan-300 rounded-full transition-transform active:scale-95 shadow-sm mx-1"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222630] rounded transition-colors"
            title="Step 1 Frame Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={jumpToEnd}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222630] rounded transition-colors"
            title="Jump to End (End)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right Controls: Speed & Master VU Volume */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Playback speed selector */}
          <div className="flex items-center bg-[#1e222b] border border-[#2b303c] rounded p-0.5 text-[11px]">
            {[0.5, 1.0, 1.5, 2.0].map(s => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                  playbackSpeed === s ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Master Volume & Meter */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className="text-neutral-400 hover:text-white p-1 rounded"
              title={isMuted ? 'Unmute master' : 'Mute master'}
            >
              {isMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-neutral-300" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={isMuted ? 0 : masterVolume}
              onChange={e => {
                setMasterVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 bg-[#222630] rounded cursor-pointer"
              title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
            />

            {/* Live VU Peak Meter */}
            <div className="w-8 h-2.5 bg-[#1a1c22] border border-[#2b303c] rounded overflow-hidden flex">
              <div
                className={`h-full transition-all duration-75 ${
                  vuLevel > 0.85 ? 'bg-red-500' : vuLevel > 0.6 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.round(vuLevel * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
