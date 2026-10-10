import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Project,
  TimelineClip,
  TimelineTrack,
  TimelineMarker,
  MediaAsset,
  ActiveTool,
  ProjectResolution
} from '../types/editor';
import {
  saveProject,
  getProject,
  getAllProjects,
  saveMediaAsset,
  getAllMediaAssets,
  deleteMediaAsset as deleteStoredAsset,
  exportProjectToJSON,
  importProjectFromJSON
} from '../services/storage';
import {
  processImportedFile,
  createSMPTEColorBarsAsset,
  createSynthAudioTrack,
  createCinematicSampleVideo
} from '../services/mediaProcessing';

const STANDARD_RESOLUTIONS: Record<string, ProjectResolution> = {
  '1080p': { width: 1920, height: 1080, label: '16:9 Landscape (1080p)' },
  '720p': { width: 1280, height: 720, label: '16:9 Landscape (720p)' },
  'vertical': { width: 1080, height: 1920, label: '9:16 Vertical (Reels/Shorts)' },
  'square': { width: 1080, height: 1080, label: '1:1 Square (Feed)' },
  'cinema': { width: 2560, height: 1080, label: '21:9 Ultrawide Cinema' }
};

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'track_t1', name: 'T1 · Titles & Overlays', type: 'overlay', muted: false, hidden: false, locked: false, volume: 1.0 },
  { id: 'track_v2', name: 'V2 · Overlay Video', type: 'video', muted: false, hidden: false, locked: false, volume: 1.0 },
  { id: 'track_v1', name: 'V1 · Main Video', type: 'video', muted: false, hidden: false, locked: false, volume: 1.0 },
  { id: 'track_a1', name: 'A1 · Dialog & Foley', type: 'audio', muted: false, hidden: false, locked: false, volume: 1.0 },
  { id: 'track_a2', name: 'A2 · Music & Ambience', type: 'audio', muted: false, hidden: false, locked: false, volume: 0.8 },
];

function createDefaultProject(name = 'Cinematic Cut'): Project {
  return {
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    name,
    settings: {
      fps: 30,
      resolution: STANDARD_RESOLUTIONS['1080p'],
      backgroundColor: '#000000'
    },
    tracks: DEFAULT_TRACKS,
    clips: [],
    markers: [
      { id: 'marker_intro', time: 0, label: 'Intro', color: '#06b6d4' }
    ],
    duration: 15,
    lastModified: Date.now(),
    version: 1
  };
}

interface EditorContextType {
  project: Project;
  playhead: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  activeTool: ActiveTool;
  zoom: number; // Pixels per second
  snapping: boolean;
  rippleDelete: boolean;
  mediaAssets: MediaAsset[];
  saveStatus: 'saved' | 'saving' | 'unsaved';
  canUndo: boolean;
  canRedo: boolean;
  activeModal: 'export' | 'ai' | 'projects' | 'shortcuts' | null;

  setPlayhead: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  stepFrame: (direction: 1 | -1) => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setSelectedTrackId: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setZoom: (zoom: number) => void;
  setSnapping: (enabled: boolean) => void;
  setRippleDelete: (enabled: boolean) => void;
  setActiveModal: (modal: 'export' | 'ai' | 'projects' | 'shortcuts' | null) => void;

  // Track operations
  addTrack: (type: 'video' | 'audio' | 'overlay') => void;
  deleteTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;

  // Clip operations
  addClip: (clip: Partial<TimelineClip>, trackId?: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', deltaSec: number) => void;
  splitClipAtPlayhead: (clipId?: string) => void;
  duplicateClip: (clipId: string) => void;
  deleteClip: (clipId: string) => void;

  // Text & Overlays
  addTextClip: (preset?: 'title' | 'lower-third' | 'caption', text?: string, startTime?: number, duration?: number) => void;
  addColorClip: (color: string, duration?: number) => void;

  // Markers
  addMarker: (label?: string, color?: string) => void;
  deleteMarker: (id: string) => void;

  // Media
  importFiles: (files: FileList | File[]) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  insertAssetToTimeline: (asset: MediaAsset, startTime?: number) => void;
  addSampleAsset: (type: 'bars' | 'audio' | 'video') => Promise<void>;

  // Project management
  saveCurrentProject: () => Promise<void>;
  createNewProject: (name?: string, resolutionKey?: string) => void;
  loadProjectById: (id: string) => Promise<void>;
  exportProjectFile: () => void;
  importProjectFile: (file: File) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<Project>(createDefaultProject());
  const [playhead, setPlayheadState] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [zoom, setZoom] = useState<number>(50); // 50px per second default
  const [snapping, setSnapping] = useState<boolean>(true);
  const [rippleDelete, setRippleDelete] = useState<boolean>(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [activeModal, setActiveModal] = useState<'export' | 'ai' | 'projects' | 'shortcuts' | null>(null);

  // Undo / Redo History
  const [history, setHistory] = useState<Project[]>([createDefaultProject()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const projectRef = useRef<Project>(project);
  projectRef.current = project;

  // Push state to history
  const pushHistory = useCallback((newProject: Project) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newProject].slice(-30); // Keep max 30 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 29));
    setSaveStatus('unsaved');
  }, [historyIndex]);

  // Set playhead with bounds
  const setPlayhead = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, projectRef.current.duration));
    setPlayheadState(clamped);
  }, []);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const deltaSec = ((time - lastTimeRef.current) / 1000) * playbackSpeed;
      lastTimeRef.current = time;

      setPlayheadState(prev => {
        const nextTime = prev + deltaSec;
        if (nextTime >= projectRef.current.duration) {
          setIsPlaying(false);
          return projectRef.current.duration;
        }
        return nextTime;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  // Autosave periodically
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (saveStatus === 'unsaved') {
        setSaveStatus('saving');
        await saveProject(project);
        setSaveStatus('saved');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [project, saveStatus]);

  // Initialize DB and load initial state / sample assets
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const storedProjects = await getAllProjects();
        const storedAssets = await getAllMediaAssets();

        if (mounted) {
          if (storedAssets.length > 0) {
            setMediaAssets(storedAssets);
          } else {
            // Seed sample color calibrator and ambient music track
            const bars = createSMPTEColorBarsAsset();
            const synth = await createSynthAudioTrack('Ambient Lo-Fi Groove', 10);
            await saveMediaAsset(bars);
            await saveMediaAsset(synth);
            setMediaAssets([bars, synth]);
          }

          if (storedProjects.length > 0) {
            const latest = storedProjects[0];
            setProject(latest);
            setHistory([latest]);
            setHistoryIndex(0);
          } else {
            // Create initial project with demo layout
            const initialProj = createDefaultProject('OpenCut Intro Project');

            // Add demo clips if media is available
            const barsAsset = createSMPTEColorBarsAsset();
            const sampleClip: TimelineClip = {
              id: 'clip_sample_1',
              trackId: 'track_v1',
              assetId: barsAsset.id,
              type: 'image',
              name: 'SMPTE Color Calibrator',
              startTime: 0,
              duration: 5,
              trimStart: 0,
              speed: 1.0,
              transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
              colorGrading: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 },
              audio: { volume: 1.0, pan: 0, fadeIn: 0, fadeOut: 0, mute: false },
              keyframes: [],
              transitionIn: { type: 'crossfade', duration: 0.5 },
              transitionOut: { type: 'crossfade', duration: 0.5 }
            };

            const titleClip: TimelineClip = {
              id: 'clip_sample_title',
              trackId: 'track_t1',
              type: 'text',
              name: 'Title Overlay',
              startTime: 0.5,
              duration: 4.0,
              trimStart: 0,
              speed: 1.0,
              transform: { x: 0, y: -40, scale: 1.0, rotation: 0, opacity: 1.0 },
              colorGrading: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 },
              audio: { volume: 1.0, pan: 0, fadeIn: 0, fadeOut: 0, mute: false },
              text: {
                content: 'OPENCUT STUDIO',
                fontFamily: 'sans-serif',
                fontSize: 54,
                fontWeight: 'bold',
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backgroundPadding: 16,
                shadowColor: '#06b6d4',
                shadowBlur: 16,
                textAlign: 'center',
                animation: 'zoom-in'
              },
              keyframes: [],
              transitionIn: { type: 'crossfade', duration: 0.3 },
              transitionOut: { type: 'crossfade', duration: 0.3 }
            };

            initialProj.clips = [sampleClip, titleClip];
            initialProj.duration = 12;

            await saveProject(initialProj);
            setProject(initialProj);
            setHistory([initialProj]);
            setHistoryIndex(0);
          }
        }
      } catch (err) {
        console.error('Failed to initialize editor storage:', err);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  // Keyboard Navigation / Playback Shortcuts
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const stepFrame = useCallback((direction: 1 | -1) => {
    setIsPlaying(false);
    const frameDuration = 1 / projectRef.current.settings.fps;
    setPlayhead(playhead + direction * frameDuration);
  }, [playhead, setPlayhead]);

  const jumpToStart = useCallback(() => {
    setIsPlaying(false);
    setPlayhead(0);
  }, [setPlayhead]);

  const jumpToEnd = useCallback(() => {
    setIsPlaying(false);
    setPlayhead(project.duration);
  }, [project.duration, setPlayhead]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setProject(prev);
      setHistoryIndex(historyIndex - 1);
      setSaveStatus('unsaved');
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setProject(next);
      setHistoryIndex(historyIndex + 1);
      setSaveStatus('unsaved');
    }
  }, [history, historyIndex]);

  // Track Actions
  const addTrack = useCallback((type: 'video' | 'audio' | 'overlay') => {
    const prefix = type === 'video' ? 'V' : type === 'audio' ? 'A' : 'T';
    const count = project.tracks.filter(t => t.type === type).length + 1;
    const newTrack: TimelineTrack = {
      id: `track_${type}_${Date.now()}`,
      name: `${prefix}${count} · ${type.toUpperCase()} Track`,
      type,
      muted: false,
      hidden: false,
      locked: false,
      volume: 1.0
    };

    setProject(prev => {
      const next = { ...prev, tracks: [newTrack, ...prev.tracks] };
      pushHistory(next);
      return next;
    });
  }, [project.tracks, pushHistory]);

  const deleteTrack = useCallback((trackId: string) => {
    setProject(prev => {
      const remainingTracks = prev.tracks.filter(t => t.id !== trackId);
      const remainingClips = prev.clips.filter(c => c.trackId !== trackId);
      const next = { ...prev, tracks: remainingTracks, clips: remainingClips };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const toggleTrackMute = useCallback((trackId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t)
    }));
  }, []);

  const toggleTrackHide = useCallback((trackId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, hidden: !t.hidden } : t)
    }));
  }, []);

  const toggleTrackLock = useCallback((trackId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t)
    }));
  }, []);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, volume } : t)
    }));
  }, []);

  // Recalculate project duration based on furthest clip edge
  const recalculateDuration = (clips: TimelineClip[], minDur = 10): number => {
    let max = minDur;
    for (const c of clips) {
      const end = c.startTime + c.duration;
      if (end > max) max = end;
    }
    return Math.ceil(max + 2); // Add 2s tail padding
  };

  // Clip Actions
  const addClip = useCallback((clipData: Partial<TimelineClip>, targetTrackId?: string) => {
    const track = targetTrackId
      ? project.tracks.find(t => t.id === targetTrackId)
      : project.tracks.find(t => t.type === (clipData.type === 'audio' ? 'audio' : 'video')) || project.tracks[0];

    if (!track) return;

    const newClip: TimelineClip = {
      id: 'clip_' + Math.random().toString(36).substring(2, 9),
      trackId: track.id,
      name: clipData.name || 'New Clip',
      type: clipData.type || 'video',
      assetId: clipData.assetId,
      startTime: clipData.startTime ?? playhead,
      duration: clipData.duration ?? 5.0,
      trimStart: clipData.trimStart ?? 0,
      speed: clipData.speed ?? 1.0,
      transform: clipData.transform || { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      colorGrading: clipData.colorGrading || { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 },
      audio: clipData.audio || { volume: 1.0, pan: 0, fadeIn: 0, fadeOut: 0, mute: false },
      text: clipData.text,
      colorValue: clipData.colorValue,
      transitionIn: clipData.transitionIn || { type: 'none', duration: 0.5 },
      transitionOut: clipData.transitionOut || { type: 'none', duration: 0.5 },
      keyframes: clipData.keyframes || []
    };

    setProject(prev => {
      const newClips = [...prev.clips, newClip];
      const newDuration = recalculateDuration(newClips, prev.duration);
      const next = { ...prev, clips: newClips, duration: newDuration };
      pushHistory(next);
      return next;
    });

    setSelectedClipId(newClip.id);
  }, [playhead, project.tracks, pushHistory]);

  const updateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
    setProject(prev => {
      const newClips = prev.clips.map(c => c.id === clipId ? { ...c, ...updates } : c);
      const newDuration = recalculateDuration(newClips, prev.duration);
      const next = { ...prev, clips: newClips, duration: newDuration };
      return next;
    });
    setSaveStatus('unsaved');
  }, []);

  const moveClip = useCallback((clipId: string, newStartTime: number, newTrackId?: string) => {
    setProject(prev => {
      const clip = prev.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      let clampedStart = Math.max(0, newStartTime);

      // Snapping to playhead or other clips
      if (snapping) {
        const threshold = 0.25; // 250ms snap radius
        if (Math.abs(clampedStart - playhead) < threshold) {
          clampedStart = playhead;
        } else {
          // Snap to other clips
          for (const other of prev.clips) {
            if (other.id === clipId) continue;
            const otherEnd = other.startTime + other.duration;
            if (Math.abs(clampedStart - otherEnd) < threshold) {
              clampedStart = otherEnd;
              break;
            }
            if (Math.abs((clampedStart + clip.duration) - other.startTime) < threshold) {
              clampedStart = other.startTime - clip.duration;
              break;
            }
          }
        }
      }

      clampedStart = Math.max(0, clampedStart);

      const newClips = prev.clips.map(c => {
        if (c.id === clipId) {
          return {
            ...c,
            startTime: clampedStart,
            trackId: newTrackId || c.trackId
          };
        }
        return c;
      });

      const newDuration = recalculateDuration(newClips, prev.duration);
      const next = { ...prev, clips: newClips, duration: newDuration };
      pushHistory(next);
      return next;
    });
  }, [playhead, pushHistory, snapping]);

  const trimClip = useCallback((clipId: string, edge: 'start' | 'end', deltaSec: number) => {
    setProject(prev => {
      const clip = prev.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      let newStartTime = clip.startTime;
      let newDuration = clip.duration;
      let newTrimStart = clip.trimStart;

      if (edge === 'start') {
        const adjustedDelta = Math.min(deltaSec, clip.duration - 0.2); // Minimum 0.2s length
        newStartTime = Math.max(0, clip.startTime + adjustedDelta);
        newDuration = clip.duration - (newStartTime - clip.startTime);
        newTrimStart = Math.max(0, clip.trimStart + (newStartTime - clip.startTime));
      } else {
        newDuration = Math.max(0.2, clip.duration + deltaSec);
      }

      const newClips = prev.clips.map(c => {
        if (c.id === clipId) {
          return {
            ...c,
            startTime: newStartTime,
            duration: newDuration,
            trimStart: newTrimStart
          };
        }
        return c;
      });

      const next = { ...prev, clips: newClips, duration: recalculateDuration(newClips, prev.duration) };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  // Razor / Split Tool
  const splitClipAtPlayhead = useCallback((clipId?: string) => {
    setProject(prev => {
      const targetId = clipId || selectedClipId;
      // If no specific clip selected, find any clip intersecting playhead on unlocked tracks
      const candidates = targetId
        ? prev.clips.filter(c => c.id === targetId)
        : prev.clips.filter(c => {
            const track = prev.tracks.find(t => t.id === c.trackId);
            return (!track || !track.locked) && playhead > c.startTime && playhead < (c.startTime + c.duration);
          });

      if (candidates.length === 0) return prev;

      let updatedClips = [...prev.clips];

      for (const clipToSplit of candidates) {
        if (playhead <= clipToSplit.startTime + 0.1 || playhead >= (clipToSplit.startTime + clipToSplit.duration - 0.1)) {
          continue;
        }

        const firstDuration = playhead - clipToSplit.startTime;
        const secondDuration = clipToSplit.duration - firstDuration;
        const secondTrimStart = clipToSplit.trimStart + (firstDuration * clipToSplit.speed);

        const firstSegment: TimelineClip = {
          ...clipToSplit,
          duration: firstDuration
        };

        const secondSegment: TimelineClip = {
          ...clipToSplit,
          id: 'clip_' + Math.random().toString(36).substring(2, 9),
          startTime: playhead,
          duration: secondDuration,
          trimStart: secondTrimStart,
          transitionIn: { type: 'none', duration: 0.5 }
        };

        updatedClips = updatedClips.filter(c => c.id !== clipToSplit.id).concat([firstSegment, secondSegment]);
      }

      const next = { ...prev, clips: updatedClips };
      pushHistory(next);
      return next;
    });
  }, [playhead, pushHistory, selectedClipId]);

  const duplicateClip = useCallback((clipId: string) => {
    setProject(prev => {
      const clip = prev.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      const duplicated: TimelineClip = {
        ...clip,
        id: 'clip_' + Math.random().toString(36).substring(2, 9),
        name: `${clip.name} (Copy)`,
        startTime: clip.startTime + clip.duration + 0.2
      };

      const newClips = [...prev.clips, duplicated];
      const next = { ...prev, clips: newClips, duration: recalculateDuration(newClips, prev.duration) };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const deleteClip = useCallback((clipId: string) => {
    setProject(prev => {
      const target = prev.clips.find(c => c.id === clipId);
      if (!target) return prev;

      let remaining = prev.clips.filter(c => c.id !== clipId);

      // Ripple Delete: shifts subsequent clips on same track backward
      if (rippleDelete) {
        remaining = remaining.map(c => {
          if (c.trackId === target.trackId && c.startTime > target.startTime) {
            return {
              ...c,
              startTime: Math.max(0, c.startTime - target.duration)
            };
          }
          return c;
        });
      }

      const next = { ...prev, clips: remaining, duration: recalculateDuration(remaining, 10) };
      pushHistory(next);
      return next;
    });
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [pushHistory, rippleDelete, selectedClipId]);

  // Insert Text Clip
  const addTextClip = useCallback((
    preset: 'title' | 'lower-third' | 'caption' = 'title',
    textStr?: string,
    startTime?: number,
    duration?: number
  ) => {
    const textTrack = project.tracks.find(t => t.type === 'overlay') || project.tracks[0];
    const dur = duration || (preset === 'caption' ? 2.5 : 4.0);
    const start = startTime !== undefined ? startTime : playhead;

    let textProps = {
      content: textStr || (preset === 'title' ? 'MAIN TITLE' : preset === 'lower-third' ? 'John Doe · Director' : 'Subtitle text'),
      fontFamily: 'sans-serif',
      fontSize: preset === 'title' ? 52 : preset === 'lower-third' ? 28 : 24,
      fontWeight: 'bold',
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      backgroundColor: preset === 'lower-third' ? 'rgba(0, 0, 0, 0.75)' : preset === 'caption' ? 'rgba(0,0,0,0.6)' : 'transparent',
      backgroundPadding: 14,
      shadowColor: '#000000',
      shadowBlur: 8,
      textAlign: 'center' as const,
      animation: preset === 'title' ? 'zoom-in' as const : 'fade' as const
    };

    const newClip: TimelineClip = {
      id: 'clip_txt_' + Math.random().toString(36).substring(2, 9),
      trackId: textTrack.id,
      name: preset === 'caption' ? 'Caption' : preset === 'lower-third' ? 'Lower Third' : 'Title',
      type: 'text',
      startTime: start,
      duration: dur,
      trimStart: 0,
      speed: 1.0,
      transform: {
        x: 0,
        y: preset === 'lower-third' ? 280 : preset === 'caption' ? 320 : 0,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0
      },
      colorGrading: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 },
      audio: { volume: 1.0, pan: 0, fadeIn: 0, fadeOut: 0, mute: false },
      text: textProps,
      keyframes: [],
      transitionIn: { type: 'crossfade', duration: 0.3 },
      transitionOut: { type: 'crossfade', duration: 0.3 }
    };

    setProject(prev => {
      const nextClips = [...prev.clips, newClip];
      const next = { ...prev, clips: nextClips, duration: recalculateDuration(nextClips, prev.duration) };
      pushHistory(next);
      return next;
    });

    setSelectedClipId(newClip.id);
  }, [playhead, project.tracks, pushHistory]);

  // Insert Solid Color Slug
  const addColorClip = useCallback((color: string, duration = 5) => {
    const videoTrack = project.tracks.find(t => t.type === 'video') || project.tracks[0];
    const newClip: TimelineClip = {
      id: 'clip_clr_' + Math.random().toString(36).substring(2, 9),
      trackId: videoTrack.id,
      name: `Solid Color (${color})`,
      type: 'color',
      startTime: playhead,
      duration,
      trimStart: 0,
      speed: 1.0,
      colorValue: color,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      colorGrading: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 },
      audio: { volume: 1.0, pan: 0, fadeIn: 0, fadeOut: 0, mute: false },
      keyframes: [],
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 }
    };

    setProject(prev => {
      const nextClips = [...prev.clips, newClip];
      const next = { ...prev, clips: nextClips, duration: recalculateDuration(nextClips, prev.duration) };
      pushHistory(next);
      return next;
    });
    setSelectedClipId(newClip.id);
  }, [playhead, project.tracks, pushHistory]);

  // Markers
  const addMarker = useCallback((label = 'Marker', color = '#06b6d4') => {
    const newMarker: TimelineMarker = {
      id: 'm_' + Math.random().toString(36).substring(2, 7),
      time: playhead,
      label,
      color
    };
    setProject(prev => ({
      ...prev,
      markers: [...prev.markers, newMarker]
    }));
  }, [playhead]);

  const deleteMarker = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      markers: prev.markers.filter(m => m.id !== id)
    }));
  }, []);

  // Import Media Files
  const importFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const asset = await processImportedFile(file);
        await saveMediaAsset(asset);
        setMediaAssets(prev => [asset, ...prev]);
      } catch (err) {
        console.error('File import error:', err);
      }
    }
  }, []);

  const deleteAsset = useCallback(async (assetId: string) => {
    await deleteStoredAsset(assetId);
    setMediaAssets(prev => prev.filter(a => a.id !== assetId));
  }, []);

  const insertAssetToTimeline = useCallback((asset: MediaAsset, startTime?: number) => {
    const targetTrackType = asset.type === 'audio' ? 'audio' : 'video';
    const targetTrack = project.tracks.find(t => t.type === targetTrackType) || project.tracks[0];
    const start = startTime !== undefined ? startTime : playhead;

    const newClip: TimelineClip = {
      id: 'clip_' + Math.random().toString(36).substring(2, 9),
      trackId: targetTrack.id,
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      startTime: start,
      duration: asset.duration || 5.0,
      trimStart: 0,
      speed: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      colorGrading: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 },
      audio: { volume: 1.0, pan: 0, fadeIn: 0, fadeOut: 0, mute: false },
      keyframes: [],
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 }
    };

    setProject(prev => {
      const nextClips = [...prev.clips, newClip];
      const next = { ...prev, clips: nextClips, duration: recalculateDuration(nextClips, prev.duration) };
      pushHistory(next);
      return next;
    });

    setSelectedClipId(newClip.id);
  }, [playhead, project.tracks, pushHistory]);

  const addSampleAsset = useCallback(async (type: 'bars' | 'audio' | 'video') => {
    let asset: MediaAsset;
    if (type === 'bars') {
      asset = createSMPTEColorBarsAsset();
    } else if (type === 'audio') {
      asset = await createSynthAudioTrack(`Synth Groove ${Date.now().toString().slice(-4)}`, 10);
    } else {
      asset = await createCinematicSampleVideo('Cinematic Motion Loop', 6);
    }

    await saveMediaAsset(asset);
    setMediaAssets(prev => [asset, ...prev]);
  }, []);

  // Save Project explicitly
  const saveCurrentProject = useCallback(async () => {
    setSaveStatus('saving');
    await saveProject(project);
    setSaveStatus('saved');
  }, [project]);

  // Create New Project
  const createNewProject = useCallback((name = 'New Project', resKey = '1080p') => {
    const newProj = createDefaultProject(name);
    if (STANDARD_RESOLUTIONS[resKey]) {
      newProj.settings.resolution = STANDARD_RESOLUTIONS[resKey];
    }
    setProject(newProj);
    setHistory([newProj]);
    setHistoryIndex(0);
    setPlayheadState(0);
    setSelectedClipId(null);
    saveProject(newProj);
  }, []);

  // Load Project
  const loadProjectById = useCallback(async (id: string) => {
    const loaded = await getProject(id);
    if (loaded) {
      setProject(loaded);
      setHistory([loaded]);
      setHistoryIndex(0);
      setPlayheadState(0);
      setSelectedClipId(null);
    }
  }, []);

  // Export & Import Project JSON
  const exportProjectFile = useCallback(() => {
    const jsonStr = exportProjectToJSON(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_project.opencut`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [project]);

  const importProjectFile = useCallback(async (file: File) => {
    const text = await file.text();
    const imported = importProjectFromJSON(text);
    await saveProject(imported);
    setProject(imported);
    setHistory([imported]);
    setHistoryIndex(0);
    setPlayheadState(0);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        project,
        playhead,
        isPlaying,
        playbackSpeed,
        selectedClipId,
        selectedTrackId,
        activeTool,
        zoom,
        snapping,
        rippleDelete,
        mediaAssets,
        saveStatus,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        activeModal,

        setPlayhead,
        setIsPlaying,
        togglePlay,
        stepFrame,
        jumpToStart,
        jumpToEnd,
        setPlaybackSpeed,
        setSelectedClipId,
        setSelectedTrackId,
        setActiveTool,
        setZoom,
        setSnapping,
        setRippleDelete,
        setActiveModal,

        addTrack,
        deleteTrack,
        toggleTrackMute,
        toggleTrackHide,
        toggleTrackLock,
        setTrackVolume,

        addClip,
        updateClip,
        moveClip,
        trimClip,
        splitClipAtPlayhead,
        duplicateClip,
        deleteClip,

        addTextClip,
        addColorClip,
        addMarker,
        deleteMarker,

        importFiles,
        deleteAsset,
        insertAssetToTimeline,
        addSampleAsset,

        saveCurrentProject,
        createNewProject,
        loadProjectById,
        exportProjectFile,
        importProjectFile,
        undo,
        redo
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
