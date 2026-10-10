import { MediaAsset, MediaType } from '@/types/editor';

// Extract waveform peaks from an AudioBuffer
export function extractWaveformPeaks(audioBuffer: AudioBuffer, targetPoints: number = 100): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const blockSize = Math.floor(totalSamples / targetPoints);
  const peaks: number[] = [];

  for (let i = 0; i < targetPoints; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }
    const avg = sum / blockSize;
    peaks.push(Math.min(1, avg * 3.5)); // Normalized boost
  }

  return peaks;
}

// Draw a clean waveform thumbnail
export function renderWaveformToDataURL(peaks: number[], width = 240, height = 80, color = '#06b6d4'): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#16181d';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = color;
  const barWidth = width / peaks.length;
  const halfH = height / 2;

  peaks.forEach((peak, i) => {
    const barH = Math.max(2, peak * (height - 10));
    ctx.fillRect(i * barWidth, halfH - barH / 2, barWidth - 1, barH);
  });

  return canvas.toDataURL('image/png');
}

// Convert AudioBuffer to WAV Blob
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + dataLength, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, dataLength, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Process user-imported files
export async function processImportedFile(file: File): Promise<MediaAsset> {
  const mime = file.type.toLowerCase();
  const id = 'asset_' + Math.random().toString(36).substring(2, 9);
  const objectUrl = URL.createObjectURL(file);

  let type: MediaType = 'image';
  if (mime.startsWith('video/')) type = 'video';
  else if (mime.startsWith('audio/')) type = 'audio';
  else if (mime.startsWith('image/')) type = 'image';

  if (type === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = objectUrl;

      video.onloadedmetadata = async () => {
        const duration = video.duration || 5;
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;

        // Capture thumbnail
        video.currentTime = Math.min(1, duration * 0.2);
        video.onseeked = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 240;
          canvas.height = 135;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 240, 135);
          }
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

          // Try extracting audio waveform from video
          let waveform: number[] | undefined;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            waveform = extractWaveformPeaks(audioBuffer, 100);
            await audioCtx.close();
          } catch {
            // Video might not have audio track or format not supported by decodeAudioData
            waveform = Array(60).fill(0.3);
          }

          resolve({
            id,
            name: file.name,
            type: 'video',
            blob: file,
            url: objectUrl,
            duration,
            width,
            height,
            waveform,
            thumbnailUrl,
            sizeBytes: file.size,
            mimeType: file.type || 'video/mp4',
            createdAt: Date.now()
          });
        };
      };

      video.onerror = () => {
        resolve({
          id,
          name: file.name,
          type: 'video',
          blob: file,
          url: objectUrl,
          duration: 5,
          width: 1920,
          height: 1080,
          sizeBytes: file.size,
          mimeType: file.type || 'video/mp4',
          createdAt: Date.now()
        });
      };
    });
  }

  if (type === 'audio') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const waveform = extractWaveformPeaks(audioBuffer, 100);
      const thumbnailUrl = renderWaveformToDataURL(waveform, 240, 80, '#06b6d4');
      const duration = audioBuffer.duration;
      await audioCtx.close();

      return {
        id,
        name: file.name,
        type: 'audio',
        blob: file,
        url: objectUrl,
        duration,
        waveform,
        thumbnailUrl,
        sizeBytes: file.size,
        mimeType: file.type || 'audio/mp3',
        createdAt: Date.now()
      };
    } catch {
      return {
        id,
        name: file.name,
        type: 'audio',
        blob: file,
        url: objectUrl,
        duration: 10,
        waveform: Array(60).fill(0.4),
        thumbnailUrl: '',
        sizeBytes: file.size,
        mimeType: file.type || 'audio/mp3',
        createdAt: Date.now()
      };
    }
  }

  // Image handling
  return new Promise((resolve) => {
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 135;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 240, 135);
        ctx.drawImage(img, 0, 0, 240, 135);
      }
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);

      resolve({
        id,
        name: file.name,
        type: 'image',
        blob: file,
        url: objectUrl,
        duration: 5, // Default 5s display duration on timeline
        width: img.naturalWidth || 1920,
        height: img.naturalHeight || 1080,
        thumbnailUrl,
        sizeBytes: file.size,
        mimeType: file.type || 'image/png',
        createdAt: Date.now()
      });
    };
    img.onerror = () => {
      resolve({
        id,
        name: file.name,
        type: 'image',
        blob: file,
        url: objectUrl,
        duration: 5,
        width: 1920,
        height: 1080,
        sizeBytes: file.size,
        mimeType: file.type || 'image/png',
        createdAt: Date.now()
      });
    };
  });
}

// Generate SMPTE 75% Color Bars Image Asset
export function createSMPTEColorBarsAsset(): MediaAsset {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;

  // Top 67%: 7 standard color bars (Grey, Yellow, Cyan, Green, Magenta, Red, Blue)
  const topColors = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
  const barW = canvas.width / topColors.length;
  topColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * barW, 0, barW, canvas.height * 0.67);
  });

  // Middle 8%: Cast bars
  const midColors = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'];
  midColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * barW, canvas.height * 0.67, barW, canvas.height * 0.08);
  });

  // Bottom 25%: -I, White, +Q, Black pluge
  ctx.fillStyle = '#00214c';
  ctx.fillRect(0, canvas.height * 0.75, barW * 1.25, canvas.height * 0.25);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(barW * 1.25, canvas.height * 0.75, barW * 1.25, canvas.height * 0.25);
  ctx.fillStyle = '#32006a';
  ctx.fillRect(barW * 2.5, canvas.height * 0.75, barW * 1.25, canvas.height * 0.25);
  ctx.fillStyle = '#131313';
  ctx.fillRect(barW * 3.75, canvas.height * 0.75, canvas.width - barW * 3.75, canvas.height * 0.25);

  const dataUrl = canvas.toDataURL('image/png');
  return {
    id: 'sample_smpte_bars',
    name: 'SMPTE Color Calibrator',
    type: 'image',
    url: dataUrl,
    duration: 5,
    width: 1920,
    height: 1080,
    thumbnailUrl: dataUrl,
    sizeBytes: 154000,
    mimeType: 'image/png',
    createdAt: Date.now()
  };
}

// Generate Procedural Lo-Fi Ambient Soundtrack (Real Audio WAV Blob)
export async function createSynthAudioTrack(title = 'Lo-Fi Ambient Beat', durationSec = 10): Promise<MediaAsset> {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

  // Simple mellow chord synth using Web Audio nodes
  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 392.00], // G7
  ];

  const chordDuration = durationSec / chords.length;

  chords.forEach((chord, chordIdx) => {
    const startTime = chordIdx * chordDuration;
    chord.forEach((freq) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Warm vibrato
      const lfo = offlineCtx.createOscillator();
      const lfoGain = offlineCtx.createGain();
      lfo.frequency.setValueAtTime(4.5, startTime);
      lfoGain.gain.setValueAtTime(1.5, startTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(startTime);
      lfo.stop(startTime + chordDuration);

      // Volume envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + chordDuration - 0.05);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + chordDuration);
    });

    // Add a gentle kick on the downbeats
    const kickOsc = offlineCtx.createOscillator();
    const kickGain = offlineCtx.createGain();
    kickOsc.frequency.setValueAtTime(120, startTime);
    kickOsc.frequency.exponentialRampToValueAtTime(35, startTime + 0.2);
    kickGain.gain.setValueAtTime(0.4, startTime);
    kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    kickOsc.connect(kickGain);
    kickGain.connect(offlineCtx.destination);
    kickOsc.start(startTime);
    kickOsc.stop(startTime + 0.3);
  });

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const objectUrl = URL.createObjectURL(wavBlob);
  const waveform = extractWaveformPeaks(renderedBuffer, 100);
  const thumbnailUrl = renderWaveformToDataURL(waveform, 240, 80, '#06b6d4');

  return {
    id: 'sample_audio_' + Math.random().toString(36).substring(2, 7),
    name: title,
    type: 'audio',
    blob: wavBlob,
    url: objectUrl,
    duration: durationSec,
    waveform,
    thumbnailUrl,
    sizeBytes: wavBlob.size,
    mimeType: 'audio/wav',
    createdAt: Date.now()
  };
}

// Generate Real Video Asset (Canvas Animation rendered via MediaRecorder to WebM)
export async function createCinematicSampleVideo(title = 'Cinematic Motion Loop', durationSec = 6): Promise<MediaAsset> {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = fps * durationSec;
  const stream = canvas.captureStream(fps);

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 2500000 });
  } catch {
    recorder = new MediaRecorder(stream);
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  recorder.start();

  let frame = 0;
  let thumbUrl = '';

  const renderFrame = () => {
    const t = frame / fps;

    // Gradient background shifting over time
    const grad = ctx.createLinearGradient(
      0,
      0,
      width * (0.5 + 0.5 * Math.sin(t * 0.8)),
      height * (0.5 + 0.5 * Math.cos(t * 0.6))
    );
    grad.addColorStop(0, '#0a192f');
    grad.addColorStop(0.5, '#0f2b46');
    grad.addColorStop(1, '#051322');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic glowing orbs
    const numOrbs = 5;
    for (let i = 0; i < numOrbs; i++) {
      const angle = t * 1.2 + (i * Math.PI * 2) / numOrbs;
      const radius = 180 + Math.sin(t * 2 + i) * 60;
      const ox = width / 2 + Math.cos(angle) * radius;
      const oy = height / 2 + Math.sin(angle * 0.8) * (radius * 0.6);

      const radGrad = ctx.createRadialGradient(ox, oy, 10, ox, oy, 140);
      const color = i % 2 === 0 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(59, 130, 246, 0.35)';
      radGrad.addColorStop(0, color);
      radGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, 140, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Modern typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPENCUT STUDIO', width / 2, height / 2 - 10);

    ctx.fillStyle = '#06b6d4';
    ctx.font = '500 16px monospace';
    ctx.fillText(`TIMECODE: 00:00:0${Math.floor(t)}:${Math.floor((t % 1) * 30).toString().padStart(2, '0')}`, width / 2, height / 2 + 35);

    if (frame === Math.floor(totalFrames / 3)) {
      thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
    }

    frame++;
    if (frame < totalFrames) {
      requestAnimationFrame(renderFrame);
    } else {
      recorder.stop();
    }
  };

  renderFrame();

  const videoBlob = await recordingPromise;
  const objectUrl = URL.createObjectURL(videoBlob);

  return {
    id: 'sample_video_' + Math.random().toString(36).substring(2, 7),
    name: title,
    type: 'video',
    blob: videoBlob,
    url: objectUrl,
    duration: durationSec,
    width,
    height,
    thumbnailUrl: thumbUrl || canvas.toDataURL('image/jpeg', 0.85),
    waveform: Array(60).fill(0.2),
    sizeBytes: videoBlob.size,
    mimeType: 'video/webm',
    createdAt: Date.now()
  };
}
