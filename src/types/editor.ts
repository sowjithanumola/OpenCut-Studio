export type MediaType = 'video' | 'audio' | 'image' | 'text' | 'color';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  blob?: Blob;
  url: string; // Object URL or data URL
  duration: number; // In seconds (0 for images)
  width?: number;
  height?: number;
  sampleRate?: number;
  waveform?: number[]; // Normalized amplitude peaks (0 to 1)
  thumbnailUrl?: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: number;
}

export interface TransformState {
  x: number; // Pixels offset from center
  y: number;
  scale: number; // 1.0 = 100%
  rotation: number; // Degrees
  opacity: number; // 0 to 1.0
  flipH?: boolean;
  flipV?: boolean;
}

export interface ColorGradingState {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  temperature: number; // -100 to 100 (cool to warm)
  tint: number; // -100 to 100 (green to magenta)
  blur: number; // 0 to 20 px
}

export interface AudioSettings {
  volume: number; // 0 to 2.0 (1.0 = 100%)
  pan: number; // -1 (left) to 1 (right)
  fadeIn: number; // Seconds
  fadeOut: number; // Seconds
  mute: boolean;
}

export interface TextSettings {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
  backgroundPadding: number;
  shadowColor: string;
  shadowBlur: number;
  textAlign: 'left' | 'center' | 'right';
  animation: 'none' | 'fade' | 'typewriter' | 'slide-up' | 'zoom-in';
}

export type TransitionType = 'none' | 'crossfade' | 'dipToBlack' | 'wipeLeft' | 'wipeRight' | 'zoom';

export interface TransitionSettings {
  type: TransitionType;
  duration: number; // In seconds, e.g. 0.5s
}

export interface Keyframe {
  id: string;
  timeOffset: number; // Offset from clip start in seconds
  property: 'opacity' | 'scale' | 'x' | 'y' | 'rotation' | 'volume';
  value: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId?: string; // Optional if generator or text
  type: MediaType;
  name: string;
  startTime: number; // In timeline seconds
  duration: number; // In timeline seconds
  trimStart: number; // Offset inside media source in seconds
  speed: number; // 0.25 to 4.0
  transform: TransformState;
  colorGrading: ColorGradingState;
  audio: AudioSettings;
  text?: TextSettings;
  colorValue?: string; // For solid color clips
  transitionIn?: TransitionSettings;
  transitionOut?: TransitionSettings;
  keyframes: Keyframe[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'overlay';
  muted: boolean;
  hidden: boolean;
  locked: boolean;
  volume: number; // Track master volume (0 to 1.5)
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface ProjectResolution {
  width: number;
  height: number;
  label: string;
}

export interface ProjectSettings {
  fps: number;
  resolution: ProjectResolution;
  backgroundColor: string;
}

export interface Project {
  id: string;
  name: string;
  settings: ProjectSettings;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  markers: TimelineMarker[];
  duration: number; // In seconds
  lastModified: number;
  version: number;
}

export type ActiveTool = 'select' | 'razor' | 'trim';

export interface ExportConfig {
  resolution: { width: number; height: number };
  fps: number;
  format: 'webm' | 'mp4' | 'wav';
  videoBitrateMbps: number;
  audioOnly: boolean;
}

export interface ExportProgress {
  status: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error' | 'cancelled';
  progressPercent: number;
  currentSecond: number;
  totalSeconds: number;
  estimatedRemainingSec: number;
  downloadUrl?: string;
  fileSizeBytes?: number;
  errorMessage?: string;
}
