import { Project, MediaAsset, ExportConfig, ExportProgress, TimelineClip } from '../types/editor';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  audioBuffers: Map<string, AudioBuffer>;
  cancelRequested: boolean;
}

// Evaluate keyframed property at specific clip time
export function getInterpolatedProperty(clip: TimelineClip, property: 'opacity' | 'scale' | 'x' | 'y' | 'rotation' | 'volume', defaultVal: number, clipTime: number): number {
  const matchingKeyframes = clip.keyframes.filter(k => k.property === property);
  if (matchingKeyframes.length === 0) return defaultVal;

  matchingKeyframes.sort((a, b) => a.timeOffset - b.timeOffset);

  if (clipTime <= matchingKeyframes[0].timeOffset) {
    return matchingKeyframes[0].value;
  }
  if (clipTime >= matchingKeyframes[matchingKeyframes.length - 1].timeOffset) {
    return matchingKeyframes[matchingKeyframes.length - 1].value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < matchingKeyframes.length - 1; i++) {
    const k1 = matchingKeyframes[i];
    const k2 = matchingKeyframes[i + 1];
    if (clipTime >= k1.timeOffset && clipTime <= k2.timeOffset) {
      const range = k2.timeOffset - k1.timeOffset;
      if (range === 0) return k1.value;
      let factor = (clipTime - k1.timeOffset) / range;

      // Easing calculation
      if (k2.easing === 'ease-in') {
        factor = factor * factor;
      } else if (k2.easing === 'ease-out') {
        factor = factor * (2 - factor);
      } else if (k2.easing === 'ease-in-out') {
        factor = factor < 0.5 ? 2 * factor * factor : -1 + (4 - 2 * factor) * factor;
      }

      return k1.value + (k2.value - k1.value) * factor;
    }
  }

  return defaultVal;
}

// Pre-load all media elements required for export
export async function prepareRenderMedia(project: Project, assets: MediaAsset[]): Promise<{
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  audioBuffers: Map<string, AudioBuffer>;
}> {
  const mediaElements = new Map<string, HTMLVideoElement | HTMLImageElement>();
  const audioBuffers = new Map<string, AudioBuffer>();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  for (const clip of project.clips) {
    if (!clip.assetId) continue;
    const asset = assets.find(a => a.id === clip.assetId);
    if (!asset) continue;

    if (asset.type === 'video' && !mediaElements.has(asset.id)) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.src = asset.url;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
        setTimeout(resolve, 2000); // Guard timeout
      });
      mediaElements.set(asset.id, video);
    } else if (asset.type === 'image' && !mediaElements.has(asset.id)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = asset.url;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 1500);
      });
      mediaElements.set(asset.id, img);
    }

    if ((asset.type === 'audio' || asset.type === 'video') && !audioBuffers.has(asset.id)) {
      try {
        const response = await fetch(asset.url);
        const arrayBuf = await response.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuf);
        audioBuffers.set(asset.id, decoded);
      } catch {
        // Continue if decode fails
      }
    }
  }

  return { mediaElements, audioBuffers };
}

// Draw a single frame of the composition onto the canvas
export function renderCompositionFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: Project,
  time: number,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  assets: MediaAsset[]
) {
  // Clear and fill background
  ctx.fillStyle = project.settings.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  // Sort tracks bottom to top: video/color first, overlay/titles on top
  const trackOrder = [...project.tracks];

  for (const track of trackOrder) {
    if (track.hidden) continue;

    // Find active clip on this track
    const clip = project.clips.find(
      c => c.trackId === track.id && time >= c.startTime && time < c.startTime + c.duration
    );
    if (!clip) continue;

    const clipTime = (time - clip.startTime);
    const mediaSourceTime = clip.trimStart + (clipTime * clip.speed);

    // Compute keyframed values
    let opacity = getInterpolatedProperty(clip, 'opacity', clip.transform.opacity ?? 1.0, clipTime);
    let scale = getInterpolatedProperty(clip, 'scale', clip.transform.scale ?? 1.0, clipTime);
    let posX = getInterpolatedProperty(clip, 'x', clip.transform.x ?? 0, clipTime);
    let posY = getInterpolatedProperty(clip, 'y', clip.transform.y ?? 0, clipTime);
    let rotation = getInterpolatedProperty(clip, 'rotation', clip.transform.rotation ?? 0, clipTime);

    // Handle Transitions
    if (clip.transitionIn && clip.transitionIn.type !== 'none' && clipTime < clip.transitionIn.duration) {
      const factor = clipTime / clip.transitionIn.duration;
      if (clip.transitionIn.type === 'crossfade') {
        opacity *= factor;
      } else if (clip.transitionIn.type === 'dipToBlack') {
        opacity *= factor;
      } else if (clip.transitionIn.type === 'zoom') {
        scale *= (0.7 + 0.3 * factor);
      }
    }

    const timeRemaining = clip.duration - clipTime;
    if (clip.transitionOut && clip.transitionOut.type !== 'none' && timeRemaining < clip.transitionOut.duration) {
      const factor = timeRemaining / clip.transitionOut.duration;
      if (clip.transitionOut.type === 'crossfade') {
        opacity *= factor;
      } else if (clip.transitionOut.type === 'dipToBlack') {
        opacity *= factor;
      }
    }

    if (opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    // Color grading filters
    const { brightness, contrast, saturation, temperature, blur } = clip.colorGrading;
    const filters: string[] = [];
    if (brightness !== 0) filters.push(`brightness(${100 + brightness}%)`);
    if (contrast !== 0) filters.push(`contrast(${100 + contrast}%)`);
    if (saturation !== 0) filters.push(`saturate(${100 + saturation}%)`);
    if (temperature !== 0) filters.push(`hue-rotate(${temperature * 0.5}deg)`);
    if (blur > 0) filters.push(`blur(${blur}px)`);

    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Position and transform
    const centerX = width / 2 + posX;
    const centerY = height / 2 + posY;
    ctx.translate(centerX, centerY);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    if (scale !== 1.0) {
      ctx.scale(scale, scale);
    }

    if (clip.type === 'color') {
      ctx.fillStyle = clip.colorValue || '#000000';
      ctx.fillRect(-width / 2, -height / 2, width, height);
    } else if (clip.type === 'video' || clip.type === 'image') {
      const element = clip.assetId ? mediaElements.get(clip.assetId) : null;
      if (element) {
        if (element instanceof HTMLVideoElement) {
          // If seeking video frame is needed
          if (Math.abs(element.currentTime - mediaSourceTime) > 0.08) {
            element.currentTime = mediaSourceTime;
          }
        }

        // Draw centered and scaled to cover/fit
        const natW = (element as any).videoWidth || (element as any).naturalWidth || width;
        const natH = (element as any).videoHeight || (element as any).naturalHeight || height;

        // Aspect fit to canvas
        const aspect = natW / natH;
        let drawW = width;
        let drawH = width / aspect;
        if (drawH < height) {
          drawH = height;
          drawW = height * aspect;
        }

        ctx.drawImage(element, -drawW / 2, -drawH / 2, drawW, drawH);
      }
    } else if (clip.type === 'text' && clip.text) {
      const { content, fontFamily, fontSize, fontWeight, color, strokeColor, strokeWidth, backgroundColor, backgroundPadding, shadowColor, shadowBlur, textAlign, animation } = clip.text;

      // Handle text animation offset/scale
      let animScale = 1;
      let animY = 0;
      let animAlpha = 1;

      if (animation === 'zoom-in' && clipTime < 0.6) {
        const p = clipTime / 0.6;
        animScale = 0.6 + 0.4 * p;
      } else if (animation === 'slide-up' && clipTime < 0.6) {
        const p = clipTime / 0.6;
        animY = (1 - p) * 30;
      } else if (animation === 'fade' && clipTime < 0.5) {
        animAlpha = clipTime / 0.5;
      }

      ctx.globalAlpha = ctx.globalAlpha * animAlpha;
      ctx.scale(animScale, animScale);
      ctx.translate(0, animY);

      ctx.font = `${fontWeight || 'bold'} ${fontSize || 48}px ${fontFamily || 'sans-serif'}`;
      ctx.textAlign = textAlign || 'center';
      ctx.textBaseline = 'middle';

      let displayContent = content;
      if (animation === 'typewriter') {
        const visibleChars = Math.floor((clipTime / (clip.duration * 0.6)) * content.length);
        displayContent = content.substring(0, Math.min(content.length, visibleChars));
      }

      const metrics = ctx.measureText(displayContent);
      const textW = metrics.width;
      const textH = fontSize * 1.2;

      // Text background box
      if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        const pad = backgroundPadding || 12;
        ctx.fillRect(-textW / 2 - pad, -textH / 2 - pad / 2, textW + pad * 2, textH + pad);
      }

      // Text shadow
      if (shadowBlur > 0 && shadowColor) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Stroke
      if (strokeWidth > 0 && strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(displayContent, 0, 0);
      }

      // Fill text
      ctx.fillStyle = color || '#ffffff';
      ctx.fillText(displayContent, 0, 0);
    }

    ctx.restore();
  }
}

// Master Render Function
export async function renderAndExportVideo(
  project: Project,
  assets: MediaAsset[],
  config: ExportConfig,
  onProgress: (progress: ExportProgress) => void,
  cancelRef: { cancelled: boolean }
): Promise<Blob> {
  const { width, height } = config.resolution;
  const fps = config.fps || 30;
  const totalDuration = Math.max(1, project.duration || 10);
  const totalFrames = Math.ceil(totalDuration * fps);

  // Initialize canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Prepare media
  onProgress({
    status: 'rendering',
    progressPercent: 2,
    currentSecond: 0,
    totalSeconds: totalDuration,
    estimatedRemainingSec: totalDuration * 1.2,
  });

  const { mediaElements, audioBuffers } = await prepareRenderMedia(project, assets);

  // Create Web Audio destination for audio mixing
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioDestination = audioCtx.createMediaStreamDestination();

  // Mix all audio clips into buffer or offline context
  const offlineAudioCtx = new OfflineAudioContext(2, Math.ceil(audioCtx.sampleRate * totalDuration), audioCtx.sampleRate);

  for (const track of project.tracks) {
    if (track.muted || track.volume === 0) continue;

    for (const clip of project.clips) {
      if (clip.trackId !== track.id || !clip.assetId) continue;
      const buffer = audioBuffers.get(clip.assetId);
      if (!buffer) continue;

      try {
        const sourceNode = offlineAudioCtx.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.playbackRate.value = clip.speed || 1.0;

        const gainNode = offlineAudioCtx.createGain();
        const baseVolume = (clip.audio.volume ?? 1.0) * (track.volume ?? 1.0);
        gainNode.gain.setValueAtTime(clip.audio.mute ? 0 : baseVolume, clip.startTime);

        // Fades
        if (clip.audio.fadeIn > 0) {
          gainNode.gain.setValueAtTime(0, clip.startTime);
          gainNode.gain.linearRampToValueAtTime(baseVolume, clip.startTime + clip.audio.fadeIn);
        }
        if (clip.audio.fadeOut > 0) {
          gainNode.gain.setValueAtTime(baseVolume, clip.startTime + clip.duration - clip.audio.fadeOut);
          gainNode.gain.linearRampToValueAtTime(0, clip.startTime + clip.duration);
        }

        sourceNode.connect(gainNode);
        gainNode.connect(offlineAudioCtx.destination);

        const offset = clip.trimStart || 0;
        sourceNode.start(clip.startTime, offset, clip.duration);
      } catch {
        // Continue if single audio node fails
      }
    }
  }

  // Render mixed audio
  let mixedAudioBuffer: AudioBuffer | null = null;
  try {
    mixedAudioBuffer = await offlineAudioCtx.startRendering();
  } catch (err) {
    console.warn('Audio rendering warning:', err);
  }

  // Hook mixed audio to real-time stream during recording
  if (mixedAudioBuffer) {
    const mixedSource = audioCtx.createBufferSource();
    mixedSource.buffer = mixedAudioBuffer;
    mixedSource.connect(audioDestination);
    mixedSource.start(0);
  }

  // Set up MediaStream and MediaRecorder
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: config.videoBitrateMbps * 1000000
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const outputBlob = new Blob(chunks, { type: mimeType });
      resolve(outputBlob);
    };
    recorder.onerror = (err) => reject(err);
  });

  recorder.start(250);

  const startTimeEpoch = Date.now();

  // Frame by Frame Rendering Loop
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (cancelRef.cancelled) {
      recorder.stop();
      await audioCtx.close();
      throw new Error('Export cancelled by user.');
    }

    const currentTime = frameIndex / fps;
    renderCompositionFrame(ctx, width, height, project, currentTime, mediaElements, assets);

    // Calculate progress and estimated time remaining
    const percent = Math.floor((frameIndex / totalFrames) * 98);
    const elapsedSec = (Date.now() - startTimeEpoch) / 1000;
    const framesPerSec = (frameIndex + 1) / (elapsedSec || 1);
    const remainingFrames = totalFrames - frameIndex;
    const estRemaining = Math.max(0, Math.ceil(remainingFrames / framesPerSec));

    if (frameIndex % Math.max(1, Math.floor(fps / 4)) === 0) {
      onProgress({
        status: 'rendering',
        progressPercent: Math.max(2, percent),
        currentSecond: parseFloat(currentTime.toFixed(1)),
        totalSeconds: totalDuration,
        estimatedRemainingSec: estRemaining
      });
    }

    // Yield execution to allow audio and canvas capture stream to encode
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  onProgress({
    status: 'encoding',
    progressPercent: 99,
    currentSecond: totalDuration,
    totalSeconds: totalDuration,
    estimatedRemainingSec: 1
  });

  // Finish recorder
  recorder.stop();
  const finalBlob = await recordingDone;
  await audioCtx.close();

  return finalBlob;
}
