import React, { useState, useRef } from 'react';
import { useEditor } from '@/context/EditorContext';
import {
  X,
  Download,
  Play,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings2
} from 'lucide-react';
import { ExportConfig, ExportProgress } from '@/types/editor';
import { renderAndExportVideo } from '@/services/exportEngine';

export const ExportModal: React.FC = () => {
  const { project, mediaAssets, setActiveModal } = useEditor();

  const [resolutionKey, setResolutionKey] = useState<string>('match');
  const [fps, setFps] = useState<number>(project.settings.fps || 30);
  const [bitrateMbps, setBitrateMbps] = useState<number>(8);
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progressPercent: 0,
    currentSecond: 0,
    totalSeconds: project.duration,
    estimatedRemainingSec: 0
  });

  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null);
  const [exportedFileSize, setExportedFileSize] = useState<number>(0);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const getTargetResolution = () => {
    if (resolutionKey === '1080p') return { width: 1920, height: 1080 };
    if (resolutionKey === '720p') return { width: 1280, height: 720 };
    if (resolutionKey === 'vertical') return { width: 1080, height: 1920 };
    if (resolutionKey === 'square') return { width: 1080, height: 1080 };
    return {
      width: project.settings.resolution.width,
      height: project.settings.resolution.height
    };
  };

  const handleStartExport = async () => {
    cancelRef.current.cancelled = false;
    setProgress({
      status: 'rendering',
      progressPercent: 0,
      currentSecond: 0,
      totalSeconds: project.duration,
      estimatedRemainingSec: project.duration
    });

    const config: ExportConfig = {
      resolution: getTargetResolution(),
      fps,
      format: 'webm',
      videoBitrateMbps: bitrateMbps,
      audioOnly: false
    };

    try {
      const outputBlob = await renderAndExportVideo(
        project,
        mediaAssets,
        config,
        (p) => setProgress(p),
        cancelRef.current
      );

      const url = URL.createObjectURL(outputBlob);
      setDownloadBlobUrl(url);
      setExportedFileSize(outputBlob.size);
      setProgress({
        status: 'completed',
        progressPercent: 100,
        currentSecond: project.duration,
        totalSeconds: project.duration,
        estimatedRemainingSec: 0,
        downloadUrl: url,
        fileSizeBytes: outputBlob.size
      });
    } catch (err: any) {
      if (cancelRef.current.cancelled) {
        setProgress(prev => ({ ...prev, status: 'cancelled' }));
      } else {
        console.error('Export error:', err);
        setProgress({
          status: 'error',
          progressPercent: 0,
          currentSecond: 0,
          totalSeconds: project.duration,
          estimatedRemainingSec: 0,
          errorMessage: err?.message || 'Rendering failed'
        });
      }
    }
  };

  const handleCancel = () => {
    cancelRef.current.cancelled = true;
  };

  const handleDownload = () => {
    if (!downloadBlobUrl) return;
    const a = document.createElement('a');
    a.href = downloadBlobUrl;
    const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_render.webm`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#16181d] border border-[#2b303c] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1c1f26] border-b border-[#2b303c] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white">Export & Render Composition</span>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#222630]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs text-neutral-300">
          {progress.status === 'idle' && (
            <>
              {/* Preset Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-neutral-400">Export Resolution</label>
                <select
                  value={resolutionKey}
                  onChange={e => setResolutionKey(e.target.value)}
                  className="bg-[#1e2129] border border-[#2b303c] rounded px-3 py-2 text-white focus:outline-none"
                >
                  <option value="match">Match Project ({project.settings.resolution.width}×{project.settings.resolution.height})</option>
                  <option value="1080p">1080p Full HD (1920×1080 Landscape)</option>
                  <option value="720p">720p HD (1280×720 Landscape)</option>
                  <option value="vertical">1080×1920 Vertical (Reels / TikTok / Shorts)</option>
                  <option value="square">1080×1080 Square (Instagram Feed)</option>
                </select>
              </div>

              {/* FPS & Bitrate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-neutral-400">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={e => setFps(parseInt(e.target.value, 10))}
                    className="bg-[#1e2129] border border-[#2b303c] rounded px-3 py-2 text-white font-mono"
                  >
                    <option value={24}>24 fps (Film)</option>
                    <option value={30}>30 fps (Web / Video)</option>
                    <option value={60}>60 fps (High Smoothness)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-neutral-400">Target Bitrate</label>
                  <select
                    value={bitrateMbps}
                    onChange={e => setBitrateMbps(parseInt(e.target.value, 10))}
                    className="bg-[#1e2129] border border-[#2b303c] rounded px-3 py-2 text-white font-mono"
                  >
                    <option value={4}>4 Mbps (Standard)</option>
                    <option value={8}>8 Mbps (High Quality)</option>
                    <option value={16}>16 Mbps (Master Quality)</option>
                  </select>
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-[#1a1c22] border border-[#2b303c] rounded p-3 flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Duration:</span>
                  <span className="text-white font-mono">{project.duration.toFixed(1)} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Encoding Format:</span>
                  <span className="text-cyan-400 font-mono">WebM (VP9/VP8 Video + Opus Audio)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Layers Included:</span>
                  <span className="text-white">{project.clips.length} timeline clips, colors, titles & audio mix</span>
                </div>
              </div>
            </>
          )}

          {/* RENDERING PROGRESS STATE */}
          {(progress.status === 'rendering' || progress.status === 'encoding') && (
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {progress.status === 'encoding'
                    ? 'Finalizing video stream encoding...'
                    : `Rendering composition frames (${progress.progressPercent}%)`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#1c1f26] border border-[#2b303c] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>

              <div className="w-full flex justify-between text-[11px] text-neutral-400 font-mono">
                <span>{progress.currentSecond}s / {progress.totalSeconds}s</span>
                <span>ETA: ~{progress.estimatedRemainingSec}s remaining</span>
              </div>

              <button
                onClick={handleCancel}
                className="mt-2 px-4 py-1.5 bg-[#222630] hover:bg-red-950/40 text-neutral-300 hover:text-red-400 border border-[#2b303c] rounded text-xs transition-colors"
              >
                Cancel Render
              </button>
            </div>
          )}

          {/* COMPLETED SUCCESS STATE */}
          {progress.status === 'completed' && (
            <div className="py-4 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-cyan-950/60 border border-cyan-800/40 rounded-full flex items-center justify-center text-cyan-400">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white">Rendering Completed!</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Output video produced successfully ({(exportedFileSize / 1024 / 1024).toFixed(2)} MB).
                </p>
              </div>

              {/* Video Player Preview */}
              {downloadBlobUrl && (
                <div className="w-full aspect-video bg-black rounded overflow-hidden border border-[#2b303c] shadow-lg">
                  <video
                    src={downloadBlobUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="w-full flex gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-cyan-400 hover:bg-cyan-300 text-neutral-900 font-semibold rounded shadow transition-colors"
                >
                  <Download className="w-4 h-4 stroke-[2.2]" />
                  <span>Download Output Video</span>
                </button>

                <button
                  onClick={() => setProgress({ status: 'idle', progressPercent: 0, currentSecond: 0, totalSeconds: project.duration, estimatedRemainingSec: 0 })}
                  className="px-4 py-2 bg-[#222630] hover:bg-[#2b303c] text-white rounded border border-[#2b303c] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {progress.status === 'error' && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <span className="text-sm text-red-300 font-medium">Export Failed</span>
              <p className="text-xs text-neutral-400">{progress.errorMessage}</p>
              <button
                onClick={() => setProgress({ status: 'idle', progressPercent: 0, currentSecond: 0, totalSeconds: project.duration, estimatedRemainingSec: 0 })}
                className="mt-2 px-4 py-1.5 bg-[#222630] hover:bg-[#2b303c] text-white rounded"
              >
                Try Again
              </button>
            </div>
          )}

          {/* CANCELLED STATE */}
          {progress.status === 'cancelled' && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <span className="text-sm text-neutral-300 font-medium">Export was cancelled.</span>
              <button
                onClick={() => setProgress({ status: 'idle', progressPercent: 0, currentSecond: 0, totalSeconds: project.duration, estimatedRemainingSec: 0 })}
                className="mt-2 px-4 py-1.5 bg-[#222630] hover:bg-[#2b303c] text-white rounded"
              >
                Back to Settings
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {progress.status === 'idle' && (
          <div className="h-12 bg-[#1c1f26] border-t border-[#2b303c] px-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-[#222630] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartExport}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-neutral-900 bg-cyan-400 hover:bg-cyan-300 rounded shadow transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Start Render</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
