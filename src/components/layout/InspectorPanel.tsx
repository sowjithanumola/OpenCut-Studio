import React, { useState } from 'react';
import { useEditor } from '@/context/EditorContext';
import {
  Sliders,
  Type,
  Volume2,
  Palette,
  RotateCcw,
  Sparkles,
  Move,
  Gauge,
  Diamond as KeyframeIcon,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { ProjectResolution } from '@/types/editor';

const RESOLUTION_OPTIONS: Record<string, ProjectResolution> = {
  '1080p': { width: 1920, height: 1080, label: '16:9 Landscape (1080p)' },
  '720p': { width: 1280, height: 720, label: '16:9 Landscape (720p)' },
  'vertical': { width: 1080, height: 1920, label: '9:16 Vertical (Reels/TikTok)' },
  'square': { width: 1080, height: 1080, label: '1:1 Square (Social)' },
  'cinema': { width: 2560, height: 1080, label: '21:9 Ultrawide Cinema' }
};

type InspectorTab = 'transform' | 'color' | 'audio' | 'text' | 'keyframes';

export const InspectorPanel: React.FC = () => {
  const {
    project,
    selectedClipId,
    updateClip,
    playhead,
    deleteClip,
    duplicateClip,
    splitClipAtPlayhead
  } = useEditor();

  const [activeTab, setActiveTab] = useState<InspectorTab>('transform');

  const selectedClip = project.clips.find(c => c.id === selectedClipId);

  // If no clip selected: show Project Inspector
  if (!selectedClip) {
    return (
      <div className="w-80 h-full bg-[#16181d] border-l border-[#2b303c] flex flex-col select-none text-neutral-300 shrink-0">
        <div className="h-9 bg-[#1a1c22] border-b border-[#2b303c] px-3 flex items-center justify-between text-xs font-medium text-neutral-200">
          <span>PROJECT SETTINGS</span>
          <span className="text-[10px] text-neutral-500 font-mono">OpenCut v1.0</span>
        </div>

        <div className="p-4 flex flex-col gap-4 text-xs overflow-y-auto">
          {/* Project Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-neutral-400">Project Title</label>
            <input
              type="text"
              value={project.name}
              readOnly
              className="bg-[#1e2129] border border-[#2b303c] rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
            />
          </div>

          {/* Resolution Preset */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-neutral-400">Canvas Aspect Ratio</label>
            <select
              value={
                Object.keys(RESOLUTION_OPTIONS).find(
                  k => RESOLUTION_OPTIONS[k].width === project.settings.resolution.width &&
                       RESOLUTION_OPTIONS[k].height === project.settings.resolution.height
                ) || '1080p'
              }
              onChange={e => {
                const opt = RESOLUTION_OPTIONS[e.target.value];
                if (opt) {
                  project.settings.resolution = opt;
                }
              }}
              className="bg-[#1e2129] border border-[#2b303c] rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
            >
              {Object.entries(RESOLUTION_OPTIONS).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.label} ({opt.width}×{opt.height})
                </option>
              ))}
            </select>
          </div>

          {/* Frame Rate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-neutral-400">Timeline Frame Rate</label>
            <select
              value={project.settings.fps}
              onChange={e => {
                project.settings.fps = parseInt(e.target.value, 10);
              }}
              className="bg-[#1e2129] border border-[#2b303c] rounded px-2.5 py-1.5 text-white focus:outline-none text-xs font-mono"
            >
              <option value={24}>24 fps (Cinematic Film)</option>
              <option value={30}>30 fps (Standard Web)</option>
              <option value={60}>60 fps (High Smoothness)</option>
            </select>
          </div>

          {/* Timeline Summary */}
          <div className="bg-[#1c1f26] border border-[#2b303c] rounded p-3 flex flex-col gap-2 mt-2">
            <div className="flex justify-between text-neutral-400">
              <span>Total Tracks:</span>
              <span className="text-white font-mono">{project.tracks.length}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Total Clips:</span>
              <span className="text-white font-mono">{project.clips.length}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Timeline Duration:</span>
              <span className="text-cyan-400 font-mono font-medium">{project.duration.toFixed(1)}s</span>
            </div>
          </div>

          <div className="text-neutral-500 text-[11px] leading-relaxed pt-2">
            Click any clip on the multitrack timeline to inspect and edit its position, scale, opacity, color grading, audio volume, keyframes, or text typography.
          </div>
        </div>
      </div>
    );
  }

  // Clip Selected View
  const clipTime = Math.max(0, playhead - selectedClip.startTime);

  const handleAddKeyframe = (property: 'opacity' | 'scale' | 'x' | 'y' | 'rotation' | 'volume', value: number) => {
    const existing = selectedClip.keyframes.filter(k => !(k.property === property && Math.abs(k.timeOffset - clipTime) < 0.1));
    const newKf = {
      id: 'kf_' + Math.random().toString(36).substring(2, 7),
      timeOffset: parseFloat(clipTime.toFixed(2)),
      property,
      value,
      easing: 'ease-in-out' as const
    };
    updateClip(selectedClip.id, {
      keyframes: [...existing, newKf]
    });
  };

  const handleDeleteKeyframe = (kfId: string) => {
    updateClip(selectedClip.id, {
      keyframes: selectedClip.keyframes.filter(k => k.id !== kfId)
    });
  };

  return (
    <div className="w-80 h-full bg-[#16181d] border-l border-[#2b303c] flex flex-col select-none text-neutral-300 shrink-0">
      {/* Clip Header Bar */}
      <div className="h-10 bg-[#1a1c22] border-b border-[#2b303c] px-3 flex items-center justify-between text-xs">
        <input
          type="text"
          value={selectedClip.name}
          onChange={e => updateClip(selectedClip.id, { name: e.target.value })}
          className="bg-transparent font-medium text-white truncate max-w-[160px] focus:bg-[#222630] px-1 py-0.5 rounded focus:outline-none"
        />

        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateClip(selectedClip.id)}
            className="text-[11px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-[#222630]"
            title="Duplicate clip"
          >
            Copy
          </button>
          <button
            onClick={() => splitClipAtPlayhead(selectedClip.id)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-[#222630]"
            title="Split at playhead"
          >
            Split
          </button>
          <button
            onClick={() => deleteClip(selectedClip.id)}
            className="text-neutral-400 hover:text-red-400 p-1 rounded hover:bg-[#222630]"
            title="Delete clip"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspector Tabs */}
      <div className="flex items-center border-b border-[#2b303c] bg-[#14161b] px-2 py-1 gap-1 text-[11px]">
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
            activeTab === 'transform' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Move className="w-3 h-3" />
          <span>Transform</span>
        </button>

        <button
          onClick={() => setActiveTab('color')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
            activeTab === 'color' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
            activeTab === 'audio' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Volume2 className="w-3 h-3" />
          <span>Audio</span>
        </button>

        {selectedClip.type === 'text' && (
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === 'text' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>Text</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('keyframes')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
            activeTab === 'keyframes' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <KeyframeIcon className="w-3 h-3" />
          <span>Keyframes</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* TRANSFORM TAB */}
        {activeTab === 'transform' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Geometry & Motion</span>
              <button
                onClick={() => updateClip(selectedClip.id, {
                  transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 }
                })}
                className="text-[11px] text-neutral-500 hover:text-cyan-400 flex items-center gap-1"
                title="Reset transform"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Position X / Y */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Position X (px)</span>
                <input
                  type="number"
                  value={selectedClip.transform.x}
                  onChange={e => updateClip(selectedClip.id, {
                    transform: { ...selectedClip.transform, x: parseFloat(e.target.value) || 0 }
                  })}
                  className="bg-[#1e2129] border border-[#2b303c] rounded px-2 py-1 text-white text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">Position Y (px)</span>
                <input
                  type="number"
                  value={selectedClip.transform.y}
                  onChange={e => updateClip(selectedClip.id, {
                    transform: { ...selectedClip.transform, y: parseFloat(e.target.value) || 0 }
                  })}
                  className="bg-[#1e2129] border border-[#2b303c] rounded px-2 py-1 text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Scale */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Scale</span>
                <span className="text-neutral-300 font-mono">{Math.round(selectedClip.transform.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={selectedClip.transform.scale}
                onChange={e => updateClip(selectedClip.id, {
                  transform: { ...selectedClip.transform, scale: parseFloat(e.target.value) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Rotation</span>
                <span className="text-neutral-300 font-mono">{selectedClip.transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={selectedClip.transform.rotation}
                onChange={e => updateClip(selectedClip.id, {
                  transform: { ...selectedClip.transform, rotation: parseInt(e.target.value, 10) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Opacity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Opacity</span>
                <span className="text-neutral-300 font-mono">{Math.round(selectedClip.transform.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.02"
                value={selectedClip.transform.opacity}
                onChange={e => updateClip(selectedClip.id, {
                  transform: { ...selectedClip.transform, opacity: parseFloat(e.target.value) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Speed Control */}
            <div className="flex flex-col gap-1 pt-2 border-t border-[#2b303c]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  <span>Playback Speed</span>
                </span>
                <span className="text-cyan-400 font-mono font-medium">{selectedClip.speed}x</span>
              </div>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {[0.5, 0.75, 1.0, 1.5, 2.0].map(sp => (
                  <button
                    key={sp}
                    onClick={() => updateClip(selectedClip.id, { speed: sp })}
                    className={`py-1 text-[11px] rounded font-mono border transition-colors ${
                      selectedClip.speed === sp
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-[#1e2129] text-neutral-400 border-[#2b303c] hover:text-white'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COLOR GRADING TAB */}
        {activeTab === 'color' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Color & Correction</span>
              <button
                onClick={() => updateClip(selectedClip.id, {
                  colorGrading: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, blur: 0 }
                })}
                className="text-[11px] text-neutral-500 hover:text-cyan-400 flex items-center gap-1"
                title="Reset color"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Brightness */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Brightness</span>
                <span className="text-neutral-300 font-mono">{selectedClip.colorGrading.brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={selectedClip.colorGrading.brightness}
                onChange={e => updateClip(selectedClip.id, {
                  colorGrading: { ...selectedClip.colorGrading, brightness: parseInt(e.target.value, 10) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Contrast</span>
                <span className="text-neutral-300 font-mono">{selectedClip.colorGrading.contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={selectedClip.colorGrading.contrast}
                onChange={e => updateClip(selectedClip.id, {
                  colorGrading: { ...selectedClip.colorGrading, contrast: parseInt(e.target.value, 10) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Saturation */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Saturation</span>
                <span className="text-neutral-300 font-mono">{selectedClip.colorGrading.saturation}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={selectedClip.colorGrading.saturation}
                onChange={e => updateClip(selectedClip.id, {
                  colorGrading: { ...selectedClip.colorGrading, saturation: parseInt(e.target.value, 10) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Temperature (Cool to Warm) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Temperature (Cool / Warm)</span>
                <span className="text-neutral-300 font-mono">{selectedClip.colorGrading.temperature}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={selectedClip.colorGrading.temperature}
                onChange={e => updateClip(selectedClip.id, {
                  colorGrading: { ...selectedClip.colorGrading, temperature: parseInt(e.target.value, 10) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Blur */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Defocus Blur</span>
                <span className="text-neutral-300 font-mono">{selectedClip.colorGrading.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={selectedClip.colorGrading.blur}
                onChange={e => updateClip(selectedClip.id, {
                  colorGrading: { ...selectedClip.colorGrading, blur: parseInt(e.target.value, 10) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-3.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Audio Gain & Mixing</span>

            {/* Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Clip Gain</span>
                <span className="text-neutral-300 font-mono">{Math.round(selectedClip.audio.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={selectedClip.audio.volume}
                onChange={e => updateClip(selectedClip.id, {
                  audio: { ...selectedClip.audio, volume: parseFloat(e.target.value) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Fade In */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Fade In</span>
                <span className="text-neutral-300 font-mono">{selectedClip.audio.fadeIn}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3.0"
                step="0.1"
                value={selectedClip.audio.fadeIn}
                onChange={e => updateClip(selectedClip.id, {
                  audio: { ...selectedClip.audio, fadeIn: parseFloat(e.target.value) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Fade Out */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Fade Out</span>
                <span className="text-neutral-300 font-mono">{selectedClip.audio.fadeOut}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3.0"
                step="0.1"
                value={selectedClip.audio.fadeOut}
                onChange={e => updateClip(selectedClip.id, {
                  audio: { ...selectedClip.audio, fadeOut: parseFloat(e.target.value) }
                })}
                className="w-full h-1 bg-[#222630] rounded"
              />
            </div>

            {/* Mute toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#2b303c]">
              <input
                type="checkbox"
                id="clipMuteCheck"
                checked={selectedClip.audio.mute}
                onChange={e => updateClip(selectedClip.id, {
                  audio: { ...selectedClip.audio, mute: e.target.checked }
                })}
                className="rounded border-[#2b303c] bg-[#1e2129] text-cyan-500"
              />
              <label htmlFor="clipMuteCheck" className="text-xs text-neutral-300 cursor-pointer">
                Mute this clip
              </label>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && selectedClip.text && (
          <div className="flex flex-col gap-3.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Typography & Style</span>

            {/* Text Content */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-neutral-400">Text Content</label>
              <textarea
                rows={2}
                value={selectedClip.text.content}
                onChange={e => updateClip(selectedClip.id, {
                  text: { ...selectedClip.text!, content: e.target.value }
                })}
                className="bg-[#1e2129] border border-[#2b303c] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-neutral-400">Font Family</label>
                <select
                  value={selectedClip.text.fontFamily}
                  onChange={e => updateClip(selectedClip.id, {
                    text: { ...selectedClip.text!, fontFamily: e.target.value }
                  })}
                  className="bg-[#1e2129] border border-[#2b303c] rounded px-2 py-1 text-white text-xs"
                >
                  <option value="sans-serif">Sans-Serif</option>
                  <option value="serif">Serif (Editorial)</option>
                  <option value="monospace">Monospace</option>
                  <option value="Impact">Impact (Bold)</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-neutral-400">Font Size ({selectedClip.text.fontSize}px)</label>
                <input
                  type="range"
                  min="16"
                  max="120"
                  value={selectedClip.text.fontSize}
                  onChange={e => updateClip(selectedClip.id, {
                    text: { ...selectedClip.text!, fontSize: parseInt(e.target.value, 10) }
                  })}
                  className="w-full h-1 bg-[#222630] rounded mt-2"
                />
              </div>
            </div>

            {/* Fill Color & Stroke */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-neutral-400">Fill Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedClip.text.color}
                    onChange={e => updateClip(selectedClip.id, {
                      text: { ...selectedClip.text!, color: e.target.value }
                    })}
                    className="w-7 h-7 rounded border border-[#2b303c] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-neutral-300">{selectedClip.text.color}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-neutral-400">Stroke Outline</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedClip.text.strokeColor}
                    onChange={e => updateClip(selectedClip.id, {
                      text: { ...selectedClip.text!, strokeColor: e.target.value }
                    })}
                    className="w-7 h-7 rounded border border-[#2b303c] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-neutral-300">{selectedClip.text.strokeWidth}px</span>
                </div>
              </div>
            </div>

            {/* Text Animation Preset */}
            <div className="flex flex-col gap-1 pt-2 border-t border-[#2b303c]">
              <label className="text-[11px] text-neutral-400">Animation Style</label>
              <select
                value={selectedClip.text.animation}
                onChange={e => updateClip(selectedClip.id, {
                  text: { ...selectedClip.text!, animation: e.target.value as any }
                })}
                className="bg-[#1e2129] border border-[#2b303c] rounded px-2.5 py-1.5 text-white text-xs"
              >
                <option value="none">None (Static)</option>
                <option value="fade">Fade In</option>
                <option value="zoom-in">Dynamic Zoom In</option>
                <option value="slide-up">Slide Up</option>
                <option value="typewriter">Typewriter Reveal</option>
              </select>
            </div>
          </div>
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === 'keyframes' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Animation Keyframes</span>
              <span className="text-[11px] text-cyan-400 font-mono">T: {clipTime.toFixed(2)}s</span>
            </div>

            {/* Add Keyframe Buttons */}
            <div className="flex flex-col gap-1.5 bg-[#1c1f26] p-2.5 rounded border border-[#2b303c]">
              <span className="text-[11px] text-neutral-400">Add Keyframe at Playhead</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  onClick={() => handleAddKeyframe('opacity', selectedClip.transform.opacity)}
                  className="px-2 py-1 bg-[#222630] hover:bg-[#2b303c] text-white rounded text-[11px] transition-colors"
                >
                  + Opacity ({Math.round(selectedClip.transform.opacity * 100)}%)
                </button>
                <button
                  onClick={() => handleAddKeyframe('scale', selectedClip.transform.scale)}
                  className="px-2 py-1 bg-[#222630] hover:bg-[#2b303c] text-white rounded text-[11px] transition-colors"
                >
                  + Scale ({Math.round(selectedClip.transform.scale * 100)}%)
                </button>
                <button
                  onClick={() => handleAddKeyframe('x', selectedClip.transform.x)}
                  className="px-2 py-1 bg-[#222630] hover:bg-[#2b303c] text-white rounded text-[11px] transition-colors"
                >
                  + Position X
                </button>
                <button
                  onClick={() => handleAddKeyframe('y', selectedClip.transform.y)}
                  className="px-2 py-1 bg-[#222630] hover:bg-[#2b303c] text-white rounded text-[11px] transition-colors"
                >
                  + Position Y
                </button>
              </div>
            </div>

            {/* List of existing keyframes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-neutral-400">Active Keyframes ({selectedClip.keyframes.length})</span>
              {selectedClip.keyframes.length === 0 ? (
                <div className="p-3 text-center text-neutral-500 text-[11px] bg-[#1a1c22] rounded border border-[#242730]">
                  No keyframes set on this clip.
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {selectedClip.keyframes.map(kf => (
                    <div
                      key={kf.id}
                      className="flex items-center justify-between p-2 bg-[#1e2129] border border-[#2b303c] rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <KeyframeIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-medium text-white uppercase text-[10px]">{kf.property}</span>
                        <span className="text-neutral-400 font-mono text-[11px]">@{kf.timeOffset}s</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-neutral-300 font-mono text-[11px]">{kf.value}</span>
                        <button
                          onClick={() => handleDeleteKeyframe(kf.id)}
                          className="text-neutral-500 hover:text-red-400 p-0.5"
                          title="Delete keyframe"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
