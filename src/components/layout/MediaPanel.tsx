import React, { useState, useRef } from 'react';
import { useEditor } from '@/context/EditorContext';
import {
  Upload,
  Video,
  Music,
  Image as ImageIcon,
  Type,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Layers,
  Wand2,
  FileSpreadsheet,
  Film
} from 'lucide-react';
import { MediaAsset } from '@/types/editor';

type TabType = 'media' | 'generators' | 'titles' | 'transitions';

export const MediaPanel: React.FC = () => {
  const {
    mediaAssets,
    importFiles,
    deleteAsset,
    insertAssetToTimeline,
    addSampleAsset,
    addTextClip,
    addColorClip,
    selectedClipId,
    updateClip,
    project,
    setActiveModal
  } = useEditor();

  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = mediaAssets.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importFiles(e.dataTransfer.files);
    }
  };

  const selectedClip = project.clips.find(c => c.id === selectedClipId);

  const applyTransitionToSelected = (type: any) => {
    if (selectedClipId) {
      updateClip(selectedClipId, {
        transitionIn: { type, duration: 0.5 },
        transitionOut: { type, duration: 0.5 }
      });
    }
  };

  return (
    <div className="w-80 h-full bg-[#16181d] border-r border-[#2b303c] flex flex-col select-none shrink-0 text-neutral-300">
      {/* Category Tabs */}
      <div className="flex items-center border-b border-[#2b303c] bg-[#1a1c22] px-2 py-1 gap-1">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'media' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>
        <button
          onClick={() => setActiveTab('generators')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'generators' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Presets</span>
        </button>
        <button
          onClick={() => setActiveTab('titles')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'titles' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Titles</span>
        </button>
        <button
          onClick={() => setActiveTab('transitions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'transitions' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>FX</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* MEDIA TAB */}
        {activeTab === 'media' && (
          <>
            {/* Search and Upload Toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e2129] border border-[#2b303c] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-[#222630] hover:bg-[#2b303c] text-white border border-[#2b303c] rounded transition-colors shrink-0"
                title="Import video, audio, or image files"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import</span>
              </button>
            </div>

            {/* Drag & Drop Import Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded p-3 text-center cursor-pointer transition-colors ${
                isDraggingOver
                  ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300'
                  : 'border-[#2b303c] hover:border-neutral-500 bg-[#1a1c22]/50 text-neutral-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-4 h-4 text-neutral-400" />
                <p className="text-xs">Drop media files here or click to browse</p>
                <span className="text-[10px] text-neutral-500">MP4, WebM, MOV, MP3, WAV, PNG, JPG</span>
              </div>
            </div>

            {/* Media Assets Grid */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5">
                <span>PROJECT BIN ({filteredAssets.length})</span>
                <button
                  onClick={() => setActiveModal('ai')}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Suggestions</span>
                </button>
              </div>

              {filteredAssets.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                  <Film className="w-6 h-6 stroke-1 text-neutral-600" />
                  <span>No media assets in project yet.</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => addSampleAsset('bars')}
                      className="text-xs text-cyan-400 underline hover:text-cyan-300"
                    >
                      Add Test Pattern
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => addSampleAsset('video')}
                      className="text-xs text-cyan-400 underline hover:text-cyan-300"
                    >
                      Add Sample Video
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="group bg-[#1e2129] border border-[#2b303c] hover:border-cyan-500/50 rounded overflow-hidden flex flex-col transition-all cursor-pointer relative"
                      onClick={() => insertAssetToTimeline(asset)}
                      title={`Click to add "${asset.name}" to timeline at playhead`}
                    >
                      {/* Thumbnail frame */}
                      <div className="relative aspect-video bg-[#101216] flex items-center justify-center overflow-hidden">
                        {asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center text-neutral-600">
                            {asset.type === 'video' ? <Video className="w-6 h-6" /> :
                             asset.type === 'audio' ? <Music className="w-6 h-6" /> :
                             <ImageIcon className="w-6 h-6" />}
                          </div>
                        )}

                        {/* Duration pill */}
                        {asset.duration > 0 && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 py-0.5 rounded tabular-nums font-mono">
                            {asset.duration.toFixed(1)}s
                          </span>
                        )}

                        {/* Type Icon */}
                        <span className="absolute top-1 left-1 bg-black/60 p-1 rounded text-neutral-300">
                          {asset.type === 'video' ? <Video className="w-3 h-3 text-cyan-400" /> :
                           asset.type === 'audio' ? <Music className="w-3 h-3 text-emerald-400" /> :
                           <ImageIcon className="w-3 h-3 text-amber-400" />}
                        </span>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              insertAssetToTimeline(asset);
                            }}
                            className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-900 rounded-full"
                            title="Add to timeline"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAsset(asset.id);
                            }}
                            className="p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-full"
                            title="Delete asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Name / Info */}
                      <div className="p-1.5 flex flex-col">
                        <span className="text-xs text-neutral-200 truncate font-medium" title={asset.name}>
                          {asset.name}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-0.5">
                          <span>{asset.type.toUpperCase()}</span>
                          <span>{(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* GENERATORS TAB */}
        {activeTab === 'generators' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] text-neutral-400">PROCEDURAL ASSETS & PATTERNS</span>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addSampleAsset('video')}
                className="flex items-center gap-3 p-2.5 bg-[#1e2129] hover:bg-[#252933] border border-[#2b303c] rounded text-left transition-colors"
              >
                <div className="w-10 h-10 bg-cyan-950/60 border border-cyan-800/40 rounded flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-white block">Cinematic Motion Video (6s)</span>
                  <span className="text-[11px] text-neutral-400">Procedural 1080p motion background</span>
                </div>
                <Plus className="w-4 h-4 text-neutral-500" />
              </button>

              <button
                onClick={() => addSampleAsset('bars')}
                className="flex items-center gap-3 p-2.5 bg-[#1e2129] hover:bg-[#252933] border border-[#2b303c] rounded text-left transition-colors"
              >
                <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-white block">SMPTE Color Bars Calibrator</span>
                  <span className="text-[11px] text-neutral-400">Standard 75% SMPTE color calibration chart</span>
                </div>
                <Plus className="w-4 h-4 text-neutral-500" />
              </button>

              <button
                onClick={() => addSampleAsset('audio')}
                className="flex items-center gap-3 p-2.5 bg-[#1e2129] hover:bg-[#252933] border border-[#2b303c] rounded text-left transition-colors"
              >
                <div className="w-10 h-10 bg-emerald-950/60 border border-emerald-800/40 rounded flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-white block">Lo-Fi Ambient Beat (10s)</span>
                  <span className="text-[11px] text-neutral-400">Synthesized chords and warm downbeat</span>
                </div>
                <Plus className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <span className="text-[11px] text-neutral-400 mt-2">SOLID COLOR SLUGS</span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Black', color: '#000000' },
                { name: 'White', color: '#ffffff' },
                { name: 'Cyan', color: '#06b6d4' },
                { name: 'Deep Blue', color: '#0f172a' }
              ].map(c => (
                <button
                  key={c.name}
                  onClick={() => addColorClip(c.color, 5)}
                  className="flex flex-col items-center gap-1 p-2 bg-[#1e2129] border border-[#2b303c] hover:border-cyan-500/50 rounded transition-all"
                  title={`Insert 5s ${c.name} slug`}
                >
                  <div
                    className="w-full h-8 rounded border border-neutral-700 shadow-inner"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-[10px] text-neutral-400">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TITLES TAB */}
        {activeTab === 'titles' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">TEXT & LOWER THIRDS</span>
              <button
                onClick={() => setActiveModal('ai')}
                className="text-cyan-400 hover:underline text-[11px] flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Hook Titles</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addTextClip('title', 'OPENCUT STUDIO', undefined, 4.0)}
                className="p-3 bg-[#1e2129] hover:bg-[#252933] border border-[#2b303c] rounded text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block tracking-wider">BOLD HEADLINE TITLE</span>
                  <span className="text-[11px] text-neutral-400">Zoom-in animated main title (4s)</span>
                </div>
                <Plus className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>

              <button
                onClick={() => addTextClip('lower-third', 'Creative Director · OpenCut Studio', undefined, 4.0)}
                className="p-3 bg-[#1e2129] hover:bg-[#252933] border border-[#2b303c] rounded text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-white block">CINEMATIC LOWER THIRD</span>
                  <span className="text-[11px] text-neutral-400">Dark bar background with clean subtitle</span>
                </div>
                <Plus className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>

              <button
                onClick={() => addTextClip('caption', 'Editable subtitle caption', undefined, 2.5)}
                className="p-3 bg-[#1e2129] hover:bg-[#252933] border border-[#2b303c] rounded text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-white block">SPEECH SUBTITLE CAPTION</span>
                  <span className="text-[11px] text-neutral-400">Compact centered subtitle box (2.5s)</span>
                </div>
                <Plus className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* TRANSITIONS & EFFECTS TAB */}
        {activeTab === 'transitions' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] text-neutral-400">CLIP TRANSITIONS & CUTS</span>
            <p className="text-[11px] text-neutral-500">
              {selectedClip
                ? `Click below to apply transition to selected clip: "${selectedClip.name}"`
                : 'Select a clip on the timeline first, then click a transition below.'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'crossfade', name: 'Crossfade', desc: 'Smooth alpha blend' },
                { id: 'dipToBlack', name: 'Dip to Black', desc: 'Fade through black' },
                { id: 'zoom', name: 'Dynamic Zoom', desc: 'Scale pop transition' },
                { id: 'none', name: 'Cut (None)', desc: 'Instant cut' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTransitionToSelected(t.id)}
                  disabled={!selectedClip}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    selectedClip
                      ? 'bg-[#1e2129] hover:bg-[#252933] border-[#2b303c] hover:border-cyan-500/50 cursor-pointer'
                      : 'bg-[#181a20] border-[#242730] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-xs font-medium text-white block">{t.name}</span>
                  <span className="text-[10px] text-neutral-400">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
