import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { 
  Clapperboard, 
  FileText, 
  Mic, 
  Image as ImageIcon, 
  Film, 
  Youtube, 
  Play, 
  CheckCircle2, 
  Code, 
  Download, 
  Settings, 
  Cpu, 
  Loader2, 
  RefreshCw,
  Copy,
  Wand2,
  PlayCircle,
  PauseCircle,
  SkipForward,
  Share2,
  Lock,
  X,
  Plus,
  Music,
  ChevronDown,
  ArrowRight,
  Sparkles,
  LayoutTemplate,
  Clock,
  Zap,
  Check,
  Video,
  Layers,
  MoreHorizontal,
  Captions,
  ArrowRightLeft,
  Volume2,
  Paperclip,
  Type as TypeIcon,
  Palette,
  BrainCircuit,
  Hourglass
} from 'lucide-react';

// --- CONSTANTS ---

const MUSIC_LIBRARY = [
  { id: 'none', name: 'Sem Música', url: '' },
  { id: 'ambient', name: 'Chill Ambient', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'upbeat', name: 'Tech Corporate', url: 'https://cdn.pixabay.com/audio/2024/01/16/audio_e2b992254f.mp3' },
  { id: 'cinematic', name: 'Cinematic Drama', url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_07806f1562.mp3' }
];

const TRANSITIONS = [
  { id: 'crossfade', name: 'Crossfade' },
  { id: 'fade_black', name: 'Fade to Black' },
  { id: 'slide', name: 'Slide Left' },
  { id: 'none', name: 'Corte Seco' }
];

const FONT_SIZES = [
  { label: 'Micro', value: 20 },
  { label: 'Discreta', value: 26 },
  { label: 'Pequena', value: 32 },
  { label: 'Média', value: 42 },
  { label: 'Grande', value: 60 },
  { label: 'Enorme', value: 80 }
];

const POPULAR_IDEAS = [
  { label: "Curiosidades Históricas", icon: "📜", img: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&q=80" },
  { label: "Marketing Digital", icon: "🚀", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" },
  { label: "Conto de Terror", icon: "👻", img: "https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=800&q=80" },
  { label: "Meditação Guiada", icon: "🧘", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80" },
  { label: "Review de Tecnologia", icon: "💻", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80" }
];

const INSPIRATION_EXAMPLES = [
  { title: "O Mistério das Pirâmides", style: "Documentário", img: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&q=80" },
  { title: "Futuro da IA", style: "Tech", img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80" },
  { title: "Café da Manhã", style: "Lifestyle", img: "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80" },
  { title: "Viagem Espacial", style: "Cinematic", img: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80" }
];

const ABSTRACT_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
  "https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=800&q=80",
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80"
];

// --- TYPES ---

type CameraMovement = 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'tilt_up' | 'static';

type Scene = {
  id: number;
  visual_prompt: string;
  narration: string;
  duration_est: number;
  status: 'pending' | 'generating_audio' | 'generating_visual' | 'completed' | 'error';
  audioUrl?: string;
  imageUrl?: string; 
  movement: CameraMovement; 
};

type VideoProject = {
  title: string;
  description: string;
  tags: string[];
  scenes: Scene[];
  topic: string;
  status: 'idle' | 'scripting' | 'review_script' | 'producing' | 'completed';
  videoBlob?: Blob;
  backgroundMusicUrl?: string;
};

// --- HELPERS ---

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const pcmToWav = (base64PCM: string, sampleRate: number = 24000) => {
  const binaryString = atob(base64PCM);
  const len = binaryString.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  const blob = new Blob([view, buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// --- VIDEO RENDERING ENGINE (Browser-side) ---

const getSupportedMimeType = () => {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
        return type;
    }
  }
  return ''; 
};

// Draw rounded rect helper
const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
};

const drawSubtitles = (ctx: CanvasRenderingContext2D, text: string, width: number, height: number, fontSize: number) => {
  ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const maxWidth = width * 0.85;
  const lineHeight = fontSize * 1.3;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Calculate box dimensions
  let maxLineWidth = 0;
  lines.forEach(l => {
     const m = ctx.measureText(l);
     if (m.width > maxLineWidth) maxLineWidth = m.width;
  });
  
  // Tighter padding for a more compact box
  const paddingH = fontSize * 0.6; 
  const paddingV = fontSize * 0.3;
  const boxWidth = maxLineWidth + (paddingH * 2);
  const totalHeight = (lines.length * lineHeight) + (paddingV * 2);
  
  // Position: Bottom with margin
  const marginBottom = 80;
  const startY = height - marginBottom - totalHeight;
  const startX = (width - boxWidth) / 2;

  // Shadow/Blur for box
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 10;
  
  // Draw Box
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; // Darker background
  drawRoundedRect(ctx, startX, startY, boxWidth, totalHeight, 24);
  
  // Reset shadow
  ctx.shadowBlur = 0;
  
  // Draw Text
  ctx.fillStyle = "#ffffff";
  lines.forEach((l, i) => {
      // Add slight drop shadow to text for contrast
      ctx.shadowColor = "black";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillText(l.trim(), width / 2, startY + paddingV + (i * lineHeight));
      
      // Clear text shadow
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
  });
};

// Advanced Motion Engine to simulate Video Clips
const drawSceneFrame = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  movement: CameraMovement,
  narration: string,
  progress: number, // 0.0 to 1.0
  globalAlpha: number
) => {
  ctx.globalAlpha = globalAlpha;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  if (img) {
    // Determine scale and offset based on movement type
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const baseScale = Math.max(width / sw, height / sh); // Cover scale
    
    let scale = baseScale;
    let tx = 0;
    let ty = 0;
    
    // Linear is often better for continuous video feel
    const p = progress; 

    switch (movement) {
      case 'zoom_in':
        scale = baseScale * (1.0 + (p * 0.15)); // Zoom 1.0 -> 1.15
        tx = (width - sw * scale) / 2;
        ty = (height - sh * scale) / 2;
        break;
      case 'zoom_out':
        scale = baseScale * (1.15 - (p * 0.15)); // Zoom 1.15 -> 1.0
        tx = (width - sw * scale) / 2;
        ty = (height - sh * scale) / 2;
        break;
      case 'pan_left':
        scale = baseScale * 1.1; // Slight zoom to allow panning
        const maxPanX_L = (sw * scale) - width;
        tx = -(maxPanX_L * p); // Move Left
        ty = (height - sh * scale) / 2;
        break;
      case 'pan_right':
        scale = baseScale * 1.1;
        const maxPanX_R = (sw * scale) - width;
        tx = -maxPanX_R + (maxPanX_R * p); // Start Left, Move Right
        ty = (height - sh * scale) / 2;
        break;
      case 'tilt_up':
        scale = baseScale * 1.1;
        const maxPanY = (sh * scale) - height;
        tx = (width - sw * scale) / 2;
        ty = -maxPanY + (maxPanY * p); // Start Low, Move Up
        break;
      default:
        scale = baseScale * 1.05; 
        tx = (width - sw * scale) / 2;
        ty = (height - sh * scale) / 2;
        break;
    }

    ctx.drawImage(img, tx, ty, sw * scale, sh * scale);
  } else {
    // Fallback
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, height);
  }
};

// Helper to preload assets (Images & Audio)
const preloadAssets = async (scenes: Scene[], musicUrl: string | undefined, audioCtx: AudioContext) => {
  // Load Scene Images
  const imagesPromise = scenes.map(async (scene) => {
      if (!scene.imageUrl) return null;
      try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = scene.imageUrl;
          await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
          });
          return img;
      } catch { return null; }
  });

  // Load Scene Audio (Voiceovers)
  const audioPromise = scenes.map(async (scene) => {
      if (!scene.audioUrl) return null;
      try {
          const response = await fetch(scene.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          return await audioCtx.decodeAudioData(arrayBuffer);
      } catch { return null; }
  });

  // Load Background Music
  let musicBuffer: AudioBuffer | null = null;
  if (musicUrl) {
    try {
        const response = await fetch(musicUrl);
        const arrayBuffer = await response.arrayBuffer();
        musicBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn("Failed to load background music", e);
    }
  }

  const [images, audioBuffers] = await Promise.all([
      Promise.all(imagesPromise),
      Promise.all(audioPromise)
  ]);
  
  return { images, audioBuffers, musicBuffer };
};

const renderVideoInBrowser = async (
  scenes: Scene[], 
  musicUrl: string | undefined, 
  withSubtitles: boolean,
  transitionType: string,
  subtitleFontSize: number,
  onProgress: (p: number) => void
): Promise<Blob> => {
  console.log("Starting final montage (Flash Engine)...");
  
  const canvas = document.createElement('canvas');
  canvas.width = 1280; // 720p HD
  canvas.height = 720;
  
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error("Could not get canvas context");

  // Setup Audio
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();
  
  try { if (audioCtx.state === 'suspended') await audioCtx.resume(); } catch (e) {}

  onProgress(5);
  const { images: loadedImages, audioBuffers, musicBuffer } = await preloadAssets(scenes, musicUrl, audioCtx);
  onProgress(15);

  // Background Music
  let musicSource: AudioBufferSourceNode | null = null;
  if (musicBuffer) {
      musicSource = audioCtx.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true;
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.15; 
      musicSource.connect(musicGain);
      musicGain.connect(dest);
      musicSource.start(0);
  }

  // Recorder
  const canvasStream = canvas.captureStream(30);
  const mixedTracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
  const mixedStream = new MediaStream(mixedTracks);
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(mixedStream, { mimeType, videoBitsPerSecond: 5000000 });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise(async (resolve, reject) => {
    recorder.onstop = () => {
       try { 
         if (musicSource) musicSource.stop();
         mixedStream.getTracks().forEach(track => track.stop()); 
         audioCtx.close();
       } catch {}
       resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.start();

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imgElement = loadedImages[i];
      const nextImgElement = (i < scenes.length - 1) ? loadedImages[i+1] : null;
      const audioBuffer = audioBuffers[i];
      
      onProgress(15 + ((i) / scenes.length) * 85);

      // Duration Logic
      let duration = 3;
      if (audioBuffer) {
        duration = audioBuffer.duration;
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);
        source.start();
      } else {
        duration = Math.max(3, scene.narration.length * 0.1);
      }

      const fps = 30;
      const totalFrames = Math.ceil(duration * fps);
      // Determine overlap/transition duration
      const transitionFrames = (transitionType === 'none') ? 0 : 30;
      
      for (let frame = 0; frame < totalFrames; frame++) {
          const progress = frame / totalFrames;

          // Base Layer
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const isTransitioning = nextImgElement && frame > totalFrames - transitionFrames;

          if (!isTransitioning) {
             // Standard Draw
             drawSceneFrame(ctx, imgElement, scene.movement, scene.narration, progress, 1.0);
          } else {
             // Handle Transition Logic
             const t = (frame - (totalFrames - transitionFrames)) / transitionFrames; // 0.0 -> 1.0

             if (transitionType === 'fade_black') {
                if (t < 0.5) {
                    // Fade Out A
                    drawSceneFrame(ctx, imgElement, scene.movement, scene.narration, progress, 1.0 - (t * 2));
                } else {
                    // Fade In B
                    drawSceneFrame(ctx, nextImgElement, scenes[i+1].movement, scenes[i+1].narration, 0, (t - 0.5) * 2);
                }
             } else if (transitionType === 'slide') {
                 // Draw A normally
                 drawSceneFrame(ctx, imgElement, scene.movement, scene.narration, progress, 1.0);
                 // Draw B Sliding in from Right to Left
                 ctx.save();
                 const slideX = canvas.width * (1 - t);
                 ctx.translate(slideX, 0);
                 drawSceneFrame(ctx, nextImgElement, scenes[i+1].movement, scenes[i+1].narration, 0, 1.0);
                 ctx.restore();
             } else {
                // Default: Crossfade
                drawSceneFrame(ctx, imgElement, scene.movement, scene.narration, progress, 1.0);
                drawSceneFrame(ctx, nextImgElement, scenes[i+1].movement, scenes[i+1].narration, 0, t);
             }
          }

          // Grain/Noise overlay for "Real" feel
          const noise = Math.floor(Math.random() * 15);
          ctx.fillStyle = `rgba(${noise}, ${noise}, ${noise}, 0.02)`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw Subtitles if enabled
          if (withSubtitles) {
              drawSubtitles(ctx, scene.narration, canvas.width, canvas.height, subtitleFontSize);
          }

          await new Promise(r => setTimeout(r, 1000 / fps));
      }
    }

    onProgress(100);
    recorder.stop();
  });
};

// --- GEMINI INTEGRATION ---

// We will instantiate this dynamically to ensure latest key is used
let ai: GoogleGenAI;

const initAI = () => {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}
// Init immediately for first load
initAI();

const generateScript = async (topic: string, duration: string, imageBase64?: string): Promise<any> => {
  initAI(); // Ensure fresh instance
  const systemPrompt = `
  You are a professional film director.
  Topic: "${topic}"
  Language: Portuguese (Brazil)
  Goal: Generate a script for a video composed of 5 clips.

  INSTRUCTIONS:
  1. Divide story into 5 Scenes.
  2. "visual_prompt": Describe a high-quality photorealistic image. 
     IMPORTANT: Describe the scene in a way that allows for motion (e.g. wide shots, clear focal points).
     Avoid complex interactions that look bad when frozen. Focus on atmosphere, landscapes, and portraits.
  3. "narration": Voiceover text in Portuguese.

  REQUIRED JSON FORMAT:
  {
    "title": "Video Title",
    "description": "Short description",
    "tags": ["tag1", "tag2"],
    "scenes": [
      {
        "visual_prompt": "Photorealistic prompt (max 60 words)",
        "narration": "Voiceover text",
        "duration_est": 5
      }
    ]
  }

  IMPORTANT: Return ONLY the JSON object.
  `;

  let attempts = 0;
  while (attempts < 3) {
    try {
      let contents: any;
      
      if (imageBase64) {
          // Multimodal Prompt
          const base64Data = imageBase64.split(',')[1];
          const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
          contents = {
            parts: [
              { text: systemPrompt },
              { text: "INSTRUCTION FOR IMAGE: Use the attached image as visual reference for the style, color palette, or subject matter of the video scenes." },
              { inlineData: { mimeType, data: base64Data } }
            ]
          };
      } else {
          // Text-only Prompt
          contents = systemPrompt;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { responseMimeType: "application/json" }
      });
      let cleanJson = response.text.trim().replace(/```json/g, '').replace(/```/g, '');
      const firstOpen = cleanJson.indexOf('{');
      const lastClose = cleanJson.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1) cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
      
      const parsed = JSON.parse(cleanJson);
      // Assign random movements
      if (parsed.scenes) {
          const moves: CameraMovement[] = ['zoom_in', 'pan_right', 'pan_left', 'zoom_out', 'tilt_up'];
          parsed.scenes = parsed.scenes.slice(0, 5).map((s: any, i: number) => ({
              ...s,
              movement: moves[i % moves.length] 
          }));
      }
      return parsed;
    } catch (e) { attempts++; await new Promise(r => setTimeout(r, 2000)); }
  }
};

const generateSceneAssetAudio = async (text: string): Promise<string> => {
    initAI();
    if (!text || !text.trim()) return ""; // Safeguard for empty strings
    
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: text }] }],
              config: {
                responseModalities: ['AUDIO' as Modality],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received");
            return pcmToWav(base64Audio, 24000); 
        } catch (e) {
            console.warn(`TTS Attempt ${attempt + 1} failed:`, e);
            lastError = e;
            if (attempt < 2) await new Promise(r => setTimeout(r, 1500)); // Backoff
        }
    }
    throw lastError;
};

// Use Gemini Flash for Image Generation (Free-tier friendly)
const generateSceneVisualKeyframe = async (prompt: string): Promise<string> => {
  initAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: [{ text: prompt + ", cinematic lighting, 8k, photorealistic, highly detailed" }] },
    });
    const base64Image = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Image) throw new Error("No image");
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (e) {
    console.error("Image gen failed", e);
    return `https://placehold.co/1280x720/1a1a1a/FFF?text=${encodeURIComponent(prompt.substring(0, 30))}`;
  }
};

// --- COMPONENTS ---

const Timer = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
};

const StepIcon = ({ step, current, label, subLabel }: any) => {
  const steps = ['idle', 'scripting', 'review_script', 'producing', 'completed'];
  const currentIndex = steps.indexOf(current);
  const stepIndex = steps.indexOf(step);
  const isCompleted = stepIndex < currentIndex;
  const isActive = stepIndex === currentIndex;

  return (
    <div className="flex items-start gap-4 group">
      <div className={`
        w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300
        ${isCompleted ? "bg-green-500 border-green-500 text-black" : 
          isActive ? "border-blue-500 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : 
          "border-zinc-800 text-transparent"}
      `}>
        {isCompleted && <Check size={16} strokeWidth={3} />}
        {isActive && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
      </div>
      <div>
        <p className={`text-sm font-bold transition-colors ${isActive || isCompleted ? 'text-white' : 'text-zinc-500'}`}>
          {label}
        </p>
        <p className="text-xs text-zinc-500">{subLabel}</p>
      </div>
    </div>
  );
};

const VideoPlayer = ({ scenes, onClose, withSubtitles }: { scenes: Scene[], onClose: () => void, withSubtitles: boolean }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentScene = scenes[currentIndex];

  useEffect(() => {
    // Sync logic for player preview
    if (isPlaying) {
        audioRef.current?.play().catch(() => {});
    } else {
        audioRef.current?.pause();
    }
  }, [currentIndex, isPlaying, currentScene]);

  const handleEnded = () => {
    if (currentIndex < scenes.length - 1) setCurrentIndex(prev => prev + 1);
    else { setIsPlaying(false); setCurrentIndex(0); }
  };
  
  const togglePlay = () => setIsPlaying(!isPlaying);

  // Preview transform styles
  const getTransform = (m: CameraMovement) => {
      if (!isPlaying) return 'scale(1)';
      // Simulation of movement for preview
      switch(m) {
          case 'zoom_in': return 'scale(1.2)';
          case 'zoom_out': return 'scale(1)';
          case 'pan_left': return 'translate(-10%, 0) scale(1.1)';
          case 'pan_right': return 'translate(10%, 0) scale(1.1)';
          default: return 'scale(1.1)';
      }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-xl">
      <div className="absolute top-6 right-6 z-50">
        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/5">
           <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-6xl aspect-video bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden shadow-2xl flex items-center justify-center">
        {currentScene?.imageUrl ? (
             <div className="relative w-full h-full overflow-hidden bg-black">
                <img 
                  key={currentScene.id}
                  src={currentScene.imageUrl} 
                  className={`w-full h-full object-cover transition-transform duration-[5000ms] ease-linear`}
                  style={{ 
                      transform: getTransform(currentScene.movement),
                      transformOrigin: 'center center'
                  }}
                />
            </div>
        ) : (
            <div className="text-zinc-500 flex flex-col items-center">
                <Loader2 className="animate-spin mb-2" size={32} />
                <span className="text-lg">Carregando Cena...</span>
            </div>
        )}
        
        {withSubtitles && (
          <div className="absolute bottom-16 left-0 right-0 text-center px-8 z-20">
              <span className="inline-block bg-black/65 text-white px-6 py-3 rounded-2xl text-xl font-medium backdrop-blur-md border border-white/10 shadow-lg max-w-4xl">
                  {currentScene?.narration}
              </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 z-30">
            <div className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: `${((currentIndex + 1) / scenes.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Audio controls playback state */}
      <audio ref={audioRef} src={currentScene?.audioUrl} onEnded={handleEnded} />

      <div className="mt-8 flex items-center gap-8">
        <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-all hover:scale-110">
            {isPlaying ? <PauseCircle size={64} fill="white" className="text-black/50" /> : <PlayCircle size={64} fill="white" className="text-black/50" />}
        </button>
        <div className="text-zinc-400 font-mono text-base bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
            Cena <span className="text-white">{currentIndex + 1}</span> <span className="text-zinc-600">/</span> {scenes.length}
        </div>
      </div>
    </div>
  );
};

const NewStyleModal = ({ onClose, onSave }: { onClose: () => void, onSave: (title: string, style: string) => void }) => {
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && style) onSave(title, style);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
       <div className="w-full max-w-md bg-[#0F0F12] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Palette size={24} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Novo Estilo</h2>
            <p className="text-zinc-500 text-sm">Crie um template personalizado para seus próximos vídeos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Título do Vídeo (Exemplo)</label>
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Minha Viagem, Review de Produto..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Categoria Visual</label>
              <input 
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Ex: Minimalista, Cyberpunk, Anos 80, Aquarela..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            
            <button 
              type="submit"
              disabled={!title || !style}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all mt-4"
            >
              Criar Estilo
            </button>
          </form>
       </div>
    </div>
  );
};

const App = () => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("3 a 5 minutos");
  const [selectedMusic, setSelectedMusic] = useState<string>("ambient");
  const [selectedTransition, setSelectedTransition] = useState<string>("crossfade");
  const [withSubtitles, setWithSubtitles] = useState(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(42);
  const [attachment, setAttachment] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); 
  const [project, setProject] = useState<VideoProject | null>(null);
  const [activeTab, setActiveTab] = useState<'workflow' | 'production'>('workflow');
  const [showPlayer, setShowPlayer] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  
  // Timer state
  const [productionStartTime, setProductionStartTime] = useState<number | null>(null);

  // Styles State
  const [styles, setStyles] = useState(INSPIRATION_EXAMPLES);
  const [showNewStyleModal, setShowNewStyleModal] = useState(false);

  // Audio Preview State
  const [playingSceneId, setPlayingSceneId] = useState<number | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processIdRef = useRef(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setAttachment(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const startProcess = async (topicOverride?: any) => {
    // Allows topic override from clickable pills (checks if it's a string, not an event object)
    const activeTopic = (typeof topicOverride === 'string' && topicOverride) ? topicOverride : topic;

    if (!activeTopic.trim() && !attachment) { alert("Por favor, digite um tema ou adicione uma imagem."); return; }
    
    const currentProcessId = processIdRef.current + 1;
    processIdRef.current = currentProcessId;

    setLoading(true);
    setLoadingProgress(0);

    const interval = setInterval(() => {
        if (processIdRef.current === currentProcessId) {
            setLoadingProgress(prev => prev >= 95 ? prev : prev + Math.floor(Math.random() * 5) + 1);
        }
    }, 400);

    const musicUrl = MUSIC_LIBRARY.find(m => m.id === selectedMusic)?.url || '';

    setProject({ 
      title: "Gerando...", description: "", tags: [], scenes: [], topic: activeTopic, 
      status: 'scripting', backgroundMusicUrl: musicUrl
    });

    try {
      const scriptData = await generateScript(activeTopic || "Video inspired by the attached image", duration, attachment || undefined);
      
      clearInterval(interval);
      if (processIdRef.current !== currentProcessId) return;

      setLoadingProgress(100);
      await new Promise(r => setTimeout(r, 400));
      if (processIdRef.current !== currentProcessId) return;

      const scenesWithStatus = (scriptData.scenes || []).map((s: any, i: number) => ({
        ...s, id: i, status: 'pending'
      }));

      setProject({
        title: scriptData.title || "Sem Título",
        description: scriptData.description || "",
        tags: Array.isArray(scriptData.tags) ? scriptData.tags : [],
        scenes: scenesWithStatus,
        topic: activeTopic,
        status: 'review_script',
        backgroundMusicUrl: musicUrl
      });
    } catch (e) {
      clearInterval(interval);
      if (processIdRef.current === currentProcessId) {
          alert("Erro ao gerar roteiro. Tente novamente.");
          setProject(null); 
      }
    } finally { 
       if (processIdRef.current === currentProcessId) setLoading(false); 
    }
  };

  const startProduction = async () => {
    if (!project) return;
    
    setProductionStartTime(Date.now()); // Inicia o contador global
    setProject(prev => prev ? { ...prev, status: 'producing' } : null);
    setActiveTab('production');

    const newScenes = [...project.scenes];
    
    for (let i = 0; i < newScenes.length; i++) {
        if (processIdRef.current !== processIdRef.current) break;
        if (newScenes[i].status === 'completed') continue;

        if (!newScenes[i].audioUrl) {
            newScenes[i].status = 'generating_audio';
            setProject(prev => prev ? { ...prev, scenes: [...newScenes] } : null);
            try {
                const audioUrl = await generateSceneAssetAudio(newScenes[i].narration);
                newScenes[i].audioUrl = audioUrl;
            } catch (e) { console.error(`Failed audio for scene ${i}`, e); }
        }

        if (!newScenes[i].imageUrl) {
            newScenes[i].status = 'generating_visual';
            setProject(prev => prev ? { ...prev, scenes: [...newScenes] } : null);
            try {
                // Using Flash Image for fast/free generation
                const imageUrl = await generateSceneVisualKeyframe(newScenes[i].visual_prompt);
                newScenes[i].imageUrl = imageUrl;
            } catch (e: any) {
                console.error(`Failed video for scene ${i}`, e);
                newScenes[i].status = 'error';
            }
        }

        newScenes[i].status = 'completed';
        setProject(prev => prev ? { ...prev, scenes: [...newScenes] } : null);
    }

    setProject(prev => prev ? { ...prev, status: 'completed' } : null);
  };

  const handlePreviewAudio = async (sceneIndex: number) => {
    const scene = project?.scenes[sceneIndex];
    if (!scene) return;

    // Stop if playing this one
    if (playingSceneId === scene.id) {
        previewAudioRef.current?.pause();
        setPlayingSceneId(null);
        return;
    }

    // Stop others
    if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPlayingSceneId(null);
    }

    let url = scene.audioUrl;

    // Generate if missing
    if (!url) {
        setAudioLoadingId(scene.id);
        try {
            url = await generateSceneAssetAudio(scene.narration);
            // Update state to save this url so we don't regen
            setProject(prev => {
                if (!prev) return null;
                const newScenes = [...prev.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], audioUrl: url };
                return { ...prev, scenes: newScenes };
            });
        } catch (e) {
            alert("Erro ao gerar áudio de prévia.");
            setAudioLoadingId(null);
            return;
        }
        setAudioLoadingId(null);
    }

    // Play
    if (url) {
        const audio = new Audio(url);
        previewAudioRef.current = audio;
        setPlayingSceneId(scene.id);
        audio.play();
        audio.onended = () => setPlayingSceneId(null);
    }
  };

  const handleRenderVideo = async () => {
      if (!project) return;
      setRendering(true);
      setRenderProgress(0);
      try {
          await new Promise(r => setTimeout(r, 100));
          const blob = await renderVideoInBrowser(
              project.scenes, 
              project.backgroundMusicUrl, 
              withSubtitles, 
              selectedTransition,
              subtitleFontSize,
              (p) => setRenderProgress(p)
          );
          setProject(prev => prev ? { ...prev, videoBlob: blob } : null);
      } catch (e) {
          alert("Erro na montagem do vídeo.");
      } finally { setRendering(false); }
  };

  const handleDownloadVideo = () => {
      if (!project?.videoBlob) return;
      const url = URL.createObjectURL(project.videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`; 
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleNewProject = () => {
    processIdRef.current += 1;
    setProject(null);
    setTopic("");
    setLoading(false);
    setDuration("3 a 5 minutos");
    setSelectedMusic("ambient");
    setSelectedTransition("crossfade");
    setWithSubtitles(true);
    setSubtitleFontSize(42);
    setAttachment(null);
    setActiveTab('workflow');
    setShowPlayer(false);
    setRendering(false);
    setRenderProgress(0);
    setPlayingSceneId(null);
    setAudioLoadingId(null);
    setProductionStartTime(null);
    if(previewAudioRef.current) previewAudioRef.current.pause();
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddStyle = (title: string, style: string) => {
    const randomBg = ABSTRACT_BACKGROUNDS[Math.floor(Math.random() * ABSTRACT_BACKGROUNDS.length)];
    const newStyle = { title, style, img: randomBg };
    setStyles([...styles, newStyle]);
    setShowNewStyleModal(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
      
      {showNewStyleModal && (
        <NewStyleModal onClose={() => setShowNewStyleModal(false)} onSave={handleAddStyle} />
      )}

      {showPlayer && project && (
        <VideoPlayer scenes={project.scenes} withSubtitles={withSubtitles} onClose={() => setShowPlayer(false)} />
      )}

      {/* NAV HEADER */}
      <header className="h-20 flex items-center justify-between px-8 bg-transparent absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Film size={20} className="text-white fill-white/20" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">AutoVideo<span className="text-blue-500">.ai</span></span>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
             {(project || loading) && (
                <button 
                  onClick={handleNewProject}
                  className="bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all border border-zinc-700/50 hover:border-zinc-600 shadow-sm"
                >
                  Novo Projeto
                </button>
             )}
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col relative">
        
        {/* === LANDING PAGE === */}
        {!project && !loading && (
            <div className="flex-1 flex flex-col items-center pt-32 pb-12 px-6 max-w-7xl mx-auto w-full">
                
                <div className="text-center mb-12 space-y-4">
                  <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                    Imagine, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Gere</span>, Assista.
                  </h1>
                  <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
                    Agora com <span className="text-blue-400 font-semibold">Gemini Flash</span> para geração ultra-rápida e gratuita.
                  </p>
                </div>

                {/* MAGIC INPUT BAR CONTAINER */}
                <div className="w-full max-w-4xl z-30 flex flex-col gap-6">

                    {/* ROW 1: INPUT + BUTTON */}
                    <div className="relative group w-full">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-30 group-hover:opacity-50 blur transition duration-500"></div>
                        <div className="relative bg-[#0F0F12] border border-zinc-800 rounded-3xl p-2 shadow-2xl flex items-center gap-2 transition-all group-focus-within:border-blue-500/50">
                            
                            {/* Attachment Button */}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl transition-all"
                                title="Anexar imagem de referência"
                            >
                                <Paperclip size={20} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                hidden 
                                onChange={handleFileSelect} 
                                accept="image/*" 
                            />

                            {/* Image Preview */}
                            {attachment && (
                                <div className="relative group/preview animate-in fade-in zoom-in duration-300">
                                    <img src={attachment} className="h-10 w-10 rounded-lg object-cover border border-zinc-700 shadow-sm" />
                                    <button 
                                        onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value=""; }}
                                        className="absolute -top-2 -right-2 bg-black text-white rounded-full p-0.5 opacity-0 group-hover/preview:opacity-100 transition-opacity border border-zinc-700"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}

                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Sobre o que é o seu vídeo hoje?"
                                className="flex-1 bg-transparent text-white text-lg p-4 outline-none placeholder-zinc-600 font-medium w-full"
                                onKeyDown={(e) => e.key === 'Enter' && startProcess()}
                            />

                            <button 
                                onClick={startProcess}
                                disabled={!topic.trim() && !attachment}
                                className="bg-white hover:bg-blue-50 text-black p-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg flex-shrink-0"
                            >
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </div>

                    {/* ROW 2: OPTIONS */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        
                        {/* Config Pills */}
                        <div className="relative flex-shrink-0">
                            <div className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-zinc-800 transition-colors">
                                <Clock size={16} className="text-blue-500" />
                                <span>{duration}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </div>
                            <select 
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                <option value="3 a 5 minutos">3 a 5 Minutos</option>
                                <option value="1 minuto (Shorts)">1 Minuto (Shorts)</option>
                            </select>
                        </div>

                        <div className="relative flex-shrink-0">
                            <div className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-zinc-800 transition-colors">
                                <Music size={16} className="text-purple-500" />
                                <span className="truncate max-w-[100px]">{MUSIC_LIBRARY.find(m => m.id === selectedMusic)?.name || 'Música'}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </div>
                            <select 
                                value={selectedMusic}
                                onChange={(e) => setSelectedMusic(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                {MUSIC_LIBRARY.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative flex-shrink-0">
                            <div className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-zinc-800 transition-colors">
                                <ArrowRightLeft size={16} className="text-orange-500" />
                                <span className="truncate max-w-[100px]">{TRANSITIONS.find(t => t.id === selectedTransition)?.name || 'Transição'}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </div>
                            <select 
                                value={selectedTransition}
                                onChange={(e) => setSelectedTransition(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                {TRANSITIONS.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative flex-shrink-0">
                            <div className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-zinc-800 transition-colors">
                                <TypeIcon size={16} className="text-pink-500" />
                                <span>{FONT_SIZES.find(f => f.value === subtitleFontSize)?.label || 'Fonte'}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </div>
                            <select 
                                value={subtitleFontSize}
                                onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                {FONT_SIZES.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative flex-shrink-0">
                            <button 
                                onClick={() => setWithSubtitles(!withSubtitles)}
                                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border border-zinc-800 transition-colors"
                            >
                                <Captions size={16} className={withSubtitles ? "text-green-500" : "text-zinc-500"} />
                                <span>{withSubtitles ? 'Com Legendas' : 'Sem Legendas'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* STYLE CARDS */}
                <div className="w-full mt-20">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Estilos & Inspirações</h2>
                        <button className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1">Ver todos <ArrowRight size={14} /></button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div 
                           onClick={() => setShowNewStyleModal(true)}
                           className="group relative aspect-[4/5] rounded-3xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-transparent flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-zinc-900/50"
                        >
                             <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus size={24} className="text-zinc-400" />
                             </div>
                             <span className="text-zinc-400 font-medium">Novo Estilo</span>
                        </div>

                        {styles.map((ex, idx) => (
                             <div 
                                key={idx} 
                                onClick={() => {
                                  const prompt = `Crie um vídeo estilo ${ex.style} sobre: ${ex.title}`;
                                  setTopic(prompt);
                                  startProcess(prompt);
                                }}
                                className="group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-zinc-500 transition-all"
                             >
                                 <img src={ex.img} alt={ex.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                 <div className="absolute bottom-5 left-5 right-5">
                                     <span className="inline-block px-2 py-1 bg-white/10 backdrop-blur-md rounded-md text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-2 border border-white/10">{ex.style}</span>
                                     <p className="text-white font-bold text-xl leading-tight group-hover:text-blue-400 transition-colors">{ex.title}</p>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>

                {/* CATEGORY PILLS */}
                <div className="w-full mt-12">
                   <h3 className="text-zinc-500 font-medium mb-4 text-sm uppercase tracking-wider ml-1">Ideias Rápidas</h3>
                   <div className="flex flex-wrap gap-3">
                        {POPULAR_IDEAS.map((idea, idx) => (
                            <button 
                                key={idx}
                                onClick={() => {
                                  setTopic(idea.label);
                                  startProcess(idea.label);
                                }}
                                className="flex items-center gap-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 pl-2 pr-5 py-2 rounded-full text-sm transition-all hover:border-zinc-600 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                                  {idea.icon}
                                </div>
                                <span className="font-medium">{idea.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* === LOADING SCREEN === */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
             <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                <div className="w-24 h-24 bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center shadow-2xl relative z-10">
                   <Loader2 size={48} className="text-blue-500 animate-spin" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-zinc-800 p-2 rounded-full border border-zinc-700">
                   <Sparkles size={20} className="text-yellow-400 fill-yellow-400" />
                </div>
             </div>

             <h2 className="text-3xl font-bold text-white mb-2">Criando seu Roteiro</h2>
             <p className="text-zinc-500 text-lg mb-8 max-w-md text-center">
                {loadingProgress < 30 ? "Analisando o tema e contexto..." :
                 loadingProgress < 60 ? "Estruturando cenas cinematográficas..." :
                 loadingProgress < 90 ? "Escrevendo narrações envolventes..." :
                 "Finalizando detalhes do projeto..."}
             </p>

             <div className="w-full max-w-md h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
             </div>
             <p className="mt-4 text-zinc-600 font-mono text-sm">{loadingProgress}%</p>
          </div>
        )}

        {/* === PROJECT WORKSPACE === */}
        {project && !loading && (
             <div className="flex-1 max-w-[1600px] mx-auto w-full p-6 pt-24 flex flex-col lg:flex-row gap-8">
                
                {/* SIDEBAR NAVIGATION */}
                <div className="lg:w-80 flex-shrink-0 flex flex-col gap-6">
                  <div className="bg-[#0F0F12] rounded-3xl border border-zinc-800/50 p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Etapas</h2>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{project.status === 'completed' ? '100%' : '50%'}</span>
                    </div>
                    
                    <div className="space-y-6 relative ml-2">
                      <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-zinc-800/50 -z-10"></div>
                      <StepIcon step="idle" current={project.status} label="Roteiro & Ideia" subLabel="Planejamento" />
                      <StepIcon step="scripting" current={project.status} label="Geração de Clipes" subLabel="Gemini Flash 2.5" />
                      <StepIcon step="review_script" current={project.status} label="Narração Neural" subLabel="Áudio TTS" />
                      <StepIcon step="producing" current={project.status} label="Montagem" subLabel="Renderização" />
                      <StepIcon step="completed" current={project.status} label="Finalizado" subLabel="Pronto para uso" />
                    </div>
                  </div>

                  <div className="bg-[#0F0F12] rounded-3xl border border-zinc-800/50 p-6 shadow-xl flex-1">
                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Detalhes</h3>
                     <h2 className="text-white font-bold text-lg leading-tight mb-2">{project.title}</h2>
                     <div className="flex flex-wrap gap-2 mb-4">
                         {project.tags.slice(0,3).map(tag => (
                             <span key={tag} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">#{tag}</span>
                         ))}
                     </div>
                     <p className="text-zinc-500 text-sm line-clamp-4">{project.description}</p>
                  </div>
                </div>

                {/* MAIN GALLERY */}
                <div className="flex-1 flex flex-col">
                  
                  {/* WORKSPACE HEADER */}
                  <div className="flex items-center justify-between mb-8">
                      <div>
                          <h1 className="text-3xl font-bold text-white mb-1">
                              {activeTab === 'workflow' ? 'Planejamento de Cenas' : 'Estúdio de Produção'}
                          </h1>
                          <p className="text-zinc-500">
                              {activeTab === 'workflow' ? 'Revise os prompts antes de gerar.' : 'Acompanhe a geração dos assets.'}
                          </p>
                      </div>

                      <div className="flex gap-2 bg-zinc-900 p-1 rounded-full border border-zinc-800">
                          <button 
                              onClick={() => setActiveTab('workflow')}
                              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'workflow' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                              Roteiro
                          </button>
                          <button 
                              onClick={() => setActiveTab('production')}
                              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'production' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                              Produção
                          </button>
                      </div>
                  </div>

                  {/* WORKFLOW TAB */}
                  {activeTab === 'workflow' && (
                      <div className="flex-1 bg-[#0F0F12] border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                          <div className="space-y-6">
                              {project.scenes.map((scene, idx) => (
                                  <div key={idx} className="group bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700/80 rounded-2xl p-6 transition-all">
                                      <div className="flex items-start gap-6">
                                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-mono text-sm shrink-0 border border-zinc-700">
                                              {idx + 1}
                                          </div>
                                          <div className="flex-1 space-y-3">
                                              <div className="flex items-center gap-3">
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20 uppercase">
                                                      {scene.movement}
                                                  </span>
                                                  <span className="text-zinc-600 text-xs flex items-center gap-1"><Clock size={10} /> ~{scene.duration_est}s</span>
                                                  
                                                  <button 
                                                      onClick={() => handlePreviewAudio(idx)}
                                                      className="ml-2 w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors border border-zinc-700 group/audio"
                                                      title="Pré-visualizar Narração"
                                                  >
                                                      {audioLoadingId === scene.id ? (
                                                          <Loader2 size={12} className="animate-spin text-blue-500" />
                                                      ) : playingSceneId === scene.id ? (
                                                          <PauseCircle size={12} className="text-green-500" />
                                                      ) : (
                                                          <Volume2 size={12} className="text-zinc-400 group-hover/audio:text-white" />
                                                      )}
                                                  </button>
                                              </div>
                                              <p className="text-zinc-300 font-medium">"{scene.narration}"</p>
                                              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                  <p className="text-zinc-500 text-sm italic">Prompt: {scene.visual_prompt}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="mt-8 flex justify-end gap-4">
                              <button 
                                  onClick={handleNewProject}
                                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-6 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 transition-all border border-zinc-700 hover:border-zinc-500"
                              >
                                  <X size={20} /> Cancelar
                              </button>
                              <button 
                                  onClick={startProduction}
                                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 shadow-xl shadow-blue-900/20"
                              >
                                  <Wand2 size={24} /> Iniciar Geração Flash (Grátis)
                              </button>
                          </div>
                      </div>
                  )}

                  {/* PRODUCTION TAB */}
                  {activeTab === 'production' && (
                      <div className="flex-1">
                         {/* Status Banner */}
                         <div className="bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 mb-8 flex items-center justify-between shadow-lg">
                             <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${project.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                     {project.status === 'completed' ? <Check size={24} /> : <Loader2 size={24} className="animate-spin" />}
                                 </div>
                                 <div>
                                     <h3 className="text-white font-bold text-lg">
                                        {project.status === 'completed' ? 'Renderização Concluída' : 'Gerando Assets (Modo Gratuito)...'}
                                     </h3>
                                     <p className="text-zinc-400 text-sm">
                                        {project.status === 'completed' ? 'Seu vídeo final está pronto.' : 'Aguarde enquanto criamos as cenas em alta definição.'}
                                     </p>
                                 </div>
                             </div>
                             
                             <div className="flex gap-3">
                                 {project.status === 'completed' && !project.videoBlob && (
                                     <button 
                                        onClick={handleRenderVideo}
                                        disabled={rendering}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                                     >
                                         {rendering ? <Loader2 className="animate-spin" size={18} /> : <Settings size={18} />}
                                         {rendering ? `Compilando ${Math.round(renderProgress)}%` : "Montar Final"}
                                     </button>
                                 )}
                                 {project.videoBlob && (
                                     <>
                                        <button onClick={() => setShowPlayer(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2">
                                            <Play size={18} fill="currentColor" /> Assistir
                                        </button>
                                        <button onClick={handleDownloadVideo} className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg">
                                            <Download size={18} /> Baixar
                                        </button>
                                     </>
                                 )}
                             </div>
                         </div>

                         {/* SCENE GALLERY GRID */}
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                             {project.scenes.map((scene, idx) => (
                                 <div key={idx} className="group relative aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-zinc-600 hover:shadow-2xl">
                                     {/* IMAGE LAYER */}
                                     {scene.imageUrl ? (
                                         <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                     ) : (
                                         <div className="w-full h-full flex flex-col items-center justify-center bg-[#0F0F12] p-4 text-center">
                                             {scene.status === 'generating_visual' || scene.status === 'generating_audio' ? (
                                                 <div className="flex flex-col items-center gap-2">
                                                     <Loader2 className="animate-spin text-blue-500" size={32} />
                                                     <span className="text-xs text-blue-400 font-medium animate-pulse">
                                                        {scene.status === 'generating_audio' ? 'Criando Áudio...' : 'Gerando Visual...'}
                                                     </span>
                                                     {productionStartTime && (
                                                        <div className="font-mono text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 mt-2">
                                                            <Timer startTime={productionStartTime} />
                                                        </div>
                                                     )}
                                                 </div>
                                             ) : (
                                                <div className="flex flex-col items-center gap-2 text-zinc-700">
                                                    <Hourglass size={32} className="opacity-50" />
                                                    <span className="text-xs font-medium">Aguardando...</span>
                                                    {productionStartTime && (
                                                        <div className="font-mono text-xs text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 mt-2">
                                                            <Timer startTime={productionStartTime} />
                                                        </div>
                                                     )}
                                                </div>
                                             )}
                                         </div>
                                     )}
                                     
                                     {/* OVERLAYS */}
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">
                                          <p className="text-white font-medium text-sm line-clamp-2 mb-2">"{scene.narration}"</p>
                                          <div className="flex items-center gap-2">
                                              <span className={`h-2 w-2 rounded-full ${scene.audioUrl ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                              <span className="text-xs text-zinc-400">{scene.audioUrl ? 'Áudio Pronto' : 'Processando Áudio...'}</span>
                                          </div>
                                     </div>

                                     {/* BADGES */}
                                     <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2 py-1 rounded">
                                         CENA {idx + 1}
                                     </div>
                                     {scene.status === 'generating_visual' && (
                                         <div className="absolute inset-0 border-2 border-blue-500/50 rounded-2xl animate-pulse pointer-events-none"></div>
                                     )}
                                 </div>
                             ))}
                         </div>
                      </div>
                  )}
                </div>
             </div>
        )}

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);