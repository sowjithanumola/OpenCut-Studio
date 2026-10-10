import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  X,
  Sparkles,
  Subtitles,
  Type,
  Lightbulb,
  Check,
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  generateAICaptions,
  generateAITitles,
  generateAIEditSuggestions,
  AICaptionItem,
  AITitleItem,
  AIEditSuggestionItem
} from '../../services/aiService';

type AITab = 'captions' | 'titles' | 'suggestions';

export const AIModal: React.FC = () => {
  const { project, addTextClip, setActiveModal, playhead } = useEditor();

  const [activeTab, setActiveTab] = useState<AITab>('captions');

  // Captions state
  const [captionContext, setCaptionContext] = useState('Cinematic product showcase and feature highlights');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [generatedCaptions, setGeneratedCaptions] = useState<AICaptionItem[]>([]);
  const [captionSource, setCaptionSource] = useState<string>('');

  // Titles state
  const [titleTopic, setTitleTopic] = useState('Next Generation Creative Tools');
  const [titleStyle, setTitleStyle] = useState('Cinematic Bold');
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<AITitleItem[]>([]);

  // Suggestions state
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AIEditSuggestionItem[]>([]);

  const handleGenerateCaptions = async () => {
    setIsGeneratingCaptions(true);
    const res = await generateAICaptions(captionContext, project.duration);
    setIsGeneratingCaptions(false);
    if (res.success) {
      setGeneratedCaptions(res.captions);
      setCaptionSource(res.source);
    }
  };

  const handleInsertAllCaptions = () => {
    generatedCaptions.forEach(cap => {
      addTextClip('caption', cap.text, cap.startTime, cap.duration);
    });
    setActiveModal(null);
  };

  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true);
    const res = await generateAITitles(titleTopic, titleStyle);
    setIsGeneratingTitles(false);
    if (res.success) {
      setGeneratedTitles(res.titles);
    }
  };

  const handleInsertTitle = (t: AITitleItem) => {
    addTextClip('title', t.text, playhead, 4.0);
    setActiveModal(null);
  };

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    const res = await generateAIEditSuggestions(project.clips.length, project.duration, 'Dynamic Promo');
    setIsGeneratingSuggestions(false);
    if (res.success) {
      setSuggestions(res.suggestions);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-[#16181d] border border-[#2b303c] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 bg-[#1c1f26] border-b border-[#2b303c] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white">AI Editing Assistant</span>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#222630]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center border-b border-[#2b303c] bg-[#14161b] px-3 py-1 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('captions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'captions' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Auto Captions</span>
          </button>

          <button
            onClick={() => setActiveTab('titles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'titles' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Title Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'suggestions' ? 'bg-[#222630] text-cyan-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Editing Tips</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto text-xs text-neutral-300 flex flex-col gap-4">
          {/* TAB 1: CAPTIONS */}
          {activeTab === 'captions' && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-neutral-400">Video Context / Subject</label>
                <input
                  type="text"
                  value={captionContext}
                  onChange={e => setCaptionContext(e.target.value)}
                  placeholder="e.g. Travel vlog in Tokyo at night"
                  className="bg-[#1e2129] border border-[#2b303c] rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500">
                  Timeline duration: {project.duration.toFixed(1)}s
                </span>
                <button
                  onClick={handleGenerateCaptions}
                  disabled={isGeneratingCaptions}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-900 font-semibold rounded transition-colors disabled:opacity-50"
                >
                  {isGeneratingCaptions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isGeneratingCaptions ? 'Generating...' : 'Generate Captions'}</span>
                </button>
              </div>

              {generatedCaptions.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-[#2b303c]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Generated {generatedCaptions.length} Caption Segments ({captionSource})
                    </span>
                    <button
                      onClick={handleInsertAllCaptions}
                      className="px-2.5 py-1 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800/40 rounded text-[11px] font-medium"
                    >
                      Insert All to Timeline
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {generatedCaptions.map((cap, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-[#1e2129] border border-[#2b303c] rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 text-[10px] tabular-nums">
                            {cap.startTime.toFixed(1)}s - {(cap.startTime + cap.duration).toFixed(1)}s
                          </span>
                          <span className="text-white text-xs">"{cap.text}"</span>
                        </div>
                        <button
                          onClick={() => addTextClip('caption', cap.text, cap.startTime, cap.duration)}
                          className="p-1 text-neutral-400 hover:text-white"
                          title="Add this caption"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TITLES */}
          {activeTab === 'titles' && (
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-neutral-400">Video Topic</label>
                  <input
                    type="text"
                    value={titleTopic}
                    onChange={e => setTitleTopic(e.target.value)}
                    className="bg-[#1e2129] border border-[#2b303c] rounded px-3 py-2 text-white text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-neutral-400">Visual Style</label>
                  <select
                    value={titleStyle}
                    onChange={e => setTitleStyle(e.target.value)}
                    className="bg-[#1e2129] border border-[#2b303c] rounded px-3 py-2 text-white text-xs"
                  >
                    <option value="Cinematic Bold">Cinematic Bold</option>
                    <option value="Minimalist Luxury">Minimalist Luxury</option>
                    <option value="High-Energy Social">High-Energy Social</option>
                    <option value="Tech Documentary">Tech Documentary</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateTitles}
                  disabled={isGeneratingTitles}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-900 font-semibold rounded transition-colors disabled:opacity-50"
                >
                  {isGeneratingTitles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isGeneratingTitles ? 'Designing...' : 'Generate Concepts'}</span>
                </button>
              </div>

              {generatedTitles.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-2 pt-3 border-t border-[#2b303c]">
                  {generatedTitles.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#1e2129] border border-[#2b303c] rounded flex items-center justify-between hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white tracking-wide" style={{ color: t.color || '#fff' }}>
                          {t.text}
                        </span>
                        {t.subtitle && (
                          <span className="text-[11px] text-neutral-400">{t.subtitle}</span>
                        )}
                        <span className="text-[10px] text-cyan-400 font-mono mt-0.5">
                          Anim: {t.animation || 'zoom-in'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleInsertTitle(t)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-xs transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add at Playhead</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div className="flex flex-col gap-3.5">
              <p className="text-xs text-neutral-400">
                Let Gemini analyze your current timeline ({project.clips.length} clips, {project.duration.toFixed(1)}s total) to recommend pacing, trimming, and transition improvements.
              </p>

              <button
                onClick={handleGenerateSuggestions}
                disabled={isGeneratingSuggestions}
                className="self-start flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-900 font-semibold rounded transition-colors disabled:opacity-50"
              >
                {isGeneratingSuggestions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                <span>{isGeneratingSuggestions ? 'Analyzing...' : 'Analyze Timeline'}</span>
              </button>

              {suggestions.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-[#2b303c]">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#1e2129] border border-[#2b303c] rounded flex items-start gap-2.5"
                    >
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wide block">
                          {s.type}
                        </span>
                        <p className="text-xs text-neutral-200 mt-0.5">{s.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
