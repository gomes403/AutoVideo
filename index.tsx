import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { 
  Film, 
  Play, 
  Download, 
  Settings, 
  Loader2, 
  Wand2, 
  X, 
  ArrowRight, 
  Check, 
  Smartphone, 
  Monitor,
  Image as ImageIcon,
  Hourglass,
  AlertCircle,
  RefreshCcw,
  Clock,
  Volume2,
  Pause
} from 'lucide-react';

// --- CONSTANTS ---

const MUSIC_LIBRARY = [
  { id: 'none', name: 'Sem Música', url: '' },
  { id: 'ambient', name: 'Chill Ambient', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'upbeat', name: 'Corporate Tech', url: 'https://cdn.pixabay.com/audio/2023/10/24/audio_345d36e2f1.mp3' },
  { id: 'cinematic', name: 'Cinematic Story', url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_07806f1562.mp3' },
  { id: 'lofi', name: 'Lofi Relax', url: 'https://cdn.pixabay.com/audio/2022/05/17/audio_10e0a39430.mp3' }
];

const FONT_SIZES = [
  { label: 'Pequena', value: 24 },
  { label: 'Média', value: 36 },
  { label: 'Grande', value: 48 },
  { label: 'Enorme', value: 64 }
];

const FORMATS = [
  { id: '16:9', label: 'Vídeo (16:9)', icon: Monitor, width: 1280, height: 720 },
  { id: '9:16', label: 'Shorts (9:16)', icon: Smartphone, width: 720, height: 1280 }
];

const INSPIRATION_EXAMPLES = [
  { title: "Futuro da IA", style: "Tech", img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80" },
  { title: "Review de Café", style: "Lifestyle", img: "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80" },
  { title: "Oceano Profundo", style: "Doc", img: "https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=800&q=80" },
  { title: "Cyberpunk City", style: "Art", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80" }
];

// --- TYPES ---

type CameraMovement = 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'tilt_up' | 'static';

type Scene = {
  id: number;
  visual_prompt: string;
  narration: string;
  duration_est: number;
  status: 'pending' | 'generating' | 'completed' | 'error' | 'retrying';
  audioUrl?: string;
  imageUrl?: string; 
  movement: CameraMovement; 
  rawAudioBase64?: string;
  retryWait?: number;
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
  aspectRatio: '16:9' | '9:16';
};

// --- HELPERS ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const pcmToWav = (base64PCM: string, sampleRate: number = 24000) => {
  try {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) buffer[i] = binaryString.charCodeAt(i);

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    const writeStr = (off: number, s: string) => { for (let i=0; i<s.length; i++) view.setUint8(off+i, s.charCodeAt(i)); };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + len, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); 
    view.setUint16(32, 2, true); 
    view.setUint16(34, 16, true); 
    writeStr(36, 'data');
    view.setUint32(40, len, true);

    return URL.createObjectURL(new Blob([view, buffer], { type: 'audio/wav' }));
  } catch (e) {
    console.error("Error creating WAV", e);
    return "";
  }
};

const getSupportedMimeType = () => {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
};

async function decodeRawPCM(
  base64: string,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- RENDER ENGINE ---

const drawSubtitles = (ctx: CanvasRenderingContext2D, text: string, w: number, h: number, fontSize: number) => {
  if (!text) return;
  ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxWidth = w * 0.85;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; }
    else line = test;
  }
  lines.push(line);
  
  const totalH = lines.length * fontSize * 1.3;
  const marginB = h * 0.15;
  const startY = h - marginB - totalH;
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 40;
  ctx.beginPath();
  ctx.roundRect((w - maxW) / 2, startY - 10, maxW, totalH + 20, 12);
  ctx.fill();
  
  ctx.fillStyle = "#fff";
  lines.forEach((l, i) => ctx.fillText(l.trim(), w / 2, startY + (i * fontSize * 1.3)));
};

const drawFrame = (ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, move: CameraMovement, p: number, alpha: number) => {
  ctx.globalAlpha = alpha;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (!img) { ctx.fillStyle = "#111"; ctx.fillRect(0,0,w,h); return; }
  
  const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  let scale = baseScale * 1.05;
  let tx = (w - img.naturalWidth * scale) / 2;
  let ty = (h - img.naturalHeight * scale) / 2;

  if (move === 'zoom_in') scale = baseScale * (1 + p * 0.15);
  else if (move === 'zoom_out') scale = baseScale * (1.15 - p * 0.15);
  else if (move === 'pan_left') tx = -((img.naturalWidth * scale - w) * p);
  else if (move === 'pan_right') tx = -(img.naturalWidth * scale - w) + (img.naturalWidth * scale - w) * p;
  else if (move === 'tilt_up') ty = -(img.naturalHeight * scale - h) + (img.naturalHeight * scale - h) * p;

  if (!move.includes('pan')) tx = (w - img.naturalWidth * scale) / 2;
  if (!move.includes('tilt')) ty = (h - img.naturalHeight * scale) / 2;

  ctx.drawImage(img, tx, ty, img.naturalWidth * scale, img.naturalHeight * scale);
};

const renderVideo = async (project: VideoProject, fontSize: number, onProgress: (p: number) => void): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const fmt = FORMATS.find(f => f.id === project.aspectRatio) || FORMATS[0];
  canvas.width = fmt.width; canvas.height = fmt.height;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();
  
  onProgress(5);
  const imgs = await Promise.all(project.scenes.map(async s => {
    if (!s.imageUrl) return null;
    const i = new Image(); i.crossOrigin = "anonymous"; i.src = s.imageUrl;
    await new Promise(r => { i.onload = r; i.onerror = r; });
    return i;
  }));
  
  onProgress(15);
  const audios = await Promise.all(project.scenes.map(async s => {
    if (s.rawAudioBase64) return decodeRawPCM(s.rawAudioBase64, audioCtx);
    if (s.audioUrl) {
      const r = await fetch(s.audioUrl);
      const ab = await r.arrayBuffer();
      return audioCtx.decodeAudioData(ab);
    }
    return null;
  }));

  let music: AudioBuffer | null = null;
  if (project.backgroundMusicUrl) {
    try {
      const r = await fetch(project.backgroundMusicUrl);
      music = await audioCtx.decodeAudioData(await r.arrayBuffer());
    } catch (e) { console.warn("Failed to load music", e); }
  }
  onProgress(25);

  const durations = audios.map((a) => a ? a.duration : 4);
  const startTimes = [0];
  for (let i = 0; i < durations.length; i++) {
    startTimes.push(startTimes[i] + durations[i]);
  }
  const total = startTimes[startTimes.length - 1];

  const recorder = new MediaRecorder(new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]), { mimeType: getSupportedMimeType(), videoBitsPerSecond: 6000000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  return new Promise(async resolve => {
    recorder.onstop = () => { audioCtx.close(); resolve(new Blob(chunks, { type: recorder.mimeType })); };
    recorder.start();
    await audioCtx.resume();
    const now = audioCtx.currentTime + 0.1;

    if (music) {
      const ms = audioCtx.createBufferSource(); ms.buffer = music; ms.loop = true;
      const mg = audioCtx.createGain(); mg.gain.value = 0.12;
      ms.connect(mg); mg.connect(dest); ms.start(now);
    }

    audios.forEach((a, i) => {
      if (a) { const s = audioCtx.createBufferSource(); s.buffer = a; s.connect(dest); s.start(now + startTimes[i]); }
    });

    const loop = () => {
      const time = audioCtx.currentTime - now;
      if (time >= total) { onProgress(100); recorder.stop(); return; }
      
      let idx = startTimes.findIndex((s, i) => time >= s && (i === startTimes.length - 2 || time < startTimes[i+1]));
      if (idx === -1) idx = 0;
      if (idx >= project.scenes.length) idx = project.scenes.length - 1;

      const scene = project.scenes[idx];
      const prog = (time - startTimes[idx]) / durations[idx];
      
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
      
      if (scene) {
        drawFrame(ctx, imgs[idx], scene.movement, prog, 1.0);
        drawSubtitles(ctx, scene.narration, canvas.width, canvas.height, fontSize);
      }
      
      onProgress(25 + (Math.max(0, Math.min(time, total)) / total) * 75);
      requestAnimationFrame(loop);
    };
    loop();
  });
};

// --- APP COMPONENT ---

const Timer = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  return <span>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</span>;
};

const App = () => {
  const [topic, setTopic] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<'16:9' | '9:16'>('16:9');
  const [selectedMusic, setSelectedMusic] = useState('ambient');
  const [subtitleSize, setSubtitleSize] = useState(36);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [tab, setTab] = useState<'workflow' | 'production'>('workflow');
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [prodStartTime, setProdStartTime] = useState<number | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Improved Retry logic for Rate Limits (429)
  const callWithRetry = async (fn: () => Promise<any>, onRetry?: (sec: number) => void, maxRetries = 10): Promise<any> => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        const errJson = JSON.stringify(error).toLowerCase();
        const isRateLimit = errJson.includes('429') || errJson.includes('resource_exhausted') || error.status === 429;
        
        if (isRateLimit && retries < maxRetries - 1) {
          const waitBase = Math.pow(1.5, retries) * 5000;
          const waitTime = waitBase + Math.random() * 2000;
          const waitSec = Math.ceil(waitTime / 1000);
          
          if (onRetry) onRetry(waitSec);
          console.warn(`Quota 429 hit. Retrying in ${waitSec}s... (Attempt ${retries + 1}/${maxRetries})`);
          await sleep(waitTime);
          retries++;
          continue;
        }
        throw error;
      }
    }
  };

  const startScript = async (t?: string) => {
    const activeTopic = t || topic;
    if (!activeTopic.trim()) return;
    setLoading(true);
    try {
      const isShorts = selectedFormat === '9:16';
      const prompt = `Crie um roteiro para um vídeo ${isShorts ? 'Vertical 9:16 (Shorts/TikTok)' : 'Horizontal 16:9'}. Tema: "${activeTopic}". Retorne APENAS JSON: {"title": "Título", "description": "Descrição", "tags": ["tag"], "scenes": [{"visual_prompt": "Prompt visual detalhado", "narration": "Texto da narração", "duration_est": 5}]}. Máximo 5 cenas. Use Português do Brasil.`;
      
      const res = await callWithRetry(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        return ai.models.generateContent({ 
          model: 'gemini-2.5-flash', 
          contents: prompt, 
          config: { responseMimeType: "application/json" } 
        });
      });
      
      const data = JSON.parse(res.text);
      const moves: CameraMovement[] = ['zoom_in', 'pan_right', 'pan_left', 'zoom_out', 'tilt_up'];
      const scenes = data.scenes.map((s: any, i: number) => ({ ...s, id: i, status: 'pending', movement: moves[i % moves.length] }));
      
      setProject({ 
        ...data, 
        scenes, 
        topic: activeTopic, 
        status: 'review_script', 
        aspectRatio: selectedFormat, 
        backgroundMusicUrl: MUSIC_LIBRARY.find(m => m.id === selectedMusic)?.url 
      });
      setTab('workflow');
    } catch (e) { 
      console.error(e);
      alert("Falha ao gerar roteiro. O limite de cota da API foi atingido. Aguarde alguns minutos e tente novamente."); 
    } finally { setLoading(false); }
  };

  const previewAudio = async (sceneId: number) => {
    if (!project) return;
    if (playingAudioId === sceneId) {
      audioPreviewRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    const scene = project.scenes[sceneId];
    
    // If audio already generated, just play it
    if (scene.audioUrl) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = scene.audioUrl;
        audioPreviewRef.current.play();
        setPlayingAudioId(sceneId);
        return;
      }
    }

    // Generate audio if not exists
    setLoadingAudioId(sceneId);
    try {
      await callWithRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const resA = await ai.models.generateContent({ 
          model: "gemini-2.5-flash-preview-tts", 
          contents: scene.narration, 
          config: { 
            responseModalities: ['AUDIO' as Modality], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } 
          } 
        });
        const base64 = resA.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64) {
          const url = pcmToWav(base64);
          // Update project state with the new audio
          const newScenes = [...project.scenes];
          newScenes[sceneId] = { ...newScenes[sceneId], audioUrl: url, rawAudioBase64: base64 };
          setProject({ ...project, scenes: newScenes });
          
          if (audioPreviewRef.current) {
            audioPreviewRef.current.src = url;
            audioPreviewRef.current.play();
            setPlayingAudioId(sceneId);
          }
        }
      });
    } catch (e) {
      console.error("Preview audio failed", e);
      alert("Falha ao gerar prévia de áudio. Cota excedida?");
    } finally {
      setLoadingAudioId(null);
    }
  };

  const produce = async () => {
    if (!project) return;
    setTab('production');
    setProject(p => p ? { ...p, status: 'producing' } : null);
    setProdStartTime(Date.now());
    
    const scenes = [...project.scenes];
    for (let i = 0; i < scenes.length; i++) {
      await sleep(3000);
      scenes[i].status = 'generating';
      setProject(p => p ? { ...p, scenes: [...scenes] } : null);
      
      try {
        // 1. Audio Generation (Skip if already generated via preview)
        if (!scenes[i].audioUrl) {
          await callWithRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resA = await ai.models.generateContent({ 
              model: "gemini-2.5-flash-preview-tts", 
              contents: scenes[i].narration, 
              config: { 
                responseModalities: ['AUDIO' as Modality], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } 
              } 
            });
            const base64 = resA.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64) {
              scenes[i].rawAudioBase64 = base64;
              scenes[i].audioUrl = pcmToWav(base64);
            }
          }, (sec) => {
            scenes[i].status = 'retrying';
            scenes[i].retryWait = sec;
            setProject(p => p ? { ...p, scenes: [...scenes] } : null);
          });
        }

        await sleep(1500);

        // 2. Image Generation
        if (!scenes[i].imageUrl) {
          await callWithRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const isShorts = project.aspectRatio === '9:16';
            const imgPrompt = scenes[i].visual_prompt + (isShorts ? ", vertical framing, 9:16 portrait style, high detail" : ", cinematic 16:9 widescreen, ultra high detail");
            const resI = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: imgPrompt });
            const b64 = resI.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (b64) scenes[i].imageUrl = `data:image/jpeg;base64,${b64}`;
          }, (sec) => {
            scenes[i].status = 'retrying';
            scenes[i].retryWait = sec;
            setProject(p => p ? { ...p, scenes: [...scenes] } : null);
          });
        }

        scenes[i].status = (scenes[i].imageUrl && scenes[i].audioUrl) ? 'completed' : 'error';
      } catch (e) {
        console.error(`Persistent failure on scene ${i}`, e);
        scenes[i].status = 'error';
      }
      
      setProject(p => p ? { ...p, scenes: [...scenes] } : null);
    }
    setProject(p => p ? { ...p, status: 'completed' } : null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
      <audio 
        ref={audioPreviewRef} 
        onEnded={() => setPlayingAudioId(null)} 
        onPause={() => setPlayingAudioId(null)}
        className="hidden" 
      />

      {showPlayer && project && (
        <div className="fixed inset-0 z-[9999] bg-black/98 flex flex-col items-center justify-center p-4 backdrop-blur-xl">
          <button onClick={() => setShowPlayer(false)} className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-3 rounded-full transition"><X /></button>
          <div className={`${project.aspectRatio === '9:16' ? 'h-[85vh] aspect-[9/16]' : 'w-full max-w-5xl aspect-video'} bg-zinc-900 rounded-3xl overflow-hidden relative border border-zinc-800 shadow-2xl`}>
            {project.videoBlob ? (
              <video src={URL.createObjectURL(project.videoBlob)} controls autoPlay className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p>Processando vídeo...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <header className="h-20 flex items-center justify-between px-8 absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Film className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">AutoVideo<span className="text-blue-500">.ai</span></span>
        </div>
        {project && (
          <button onClick={() => setProject(null)} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-full text-sm font-semibold border border-zinc-700 transition text-zinc-200">
            <RefreshCcw size={14} /> Novo Projeto
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col pt-20">
        {!project && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto w-full text-center">
             <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest">
              <ImageIcon size={12} /> Powered by Gemini Flash 2.5
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight text-white">
              A sua história, <br /><span className="text-blue-500 underline decoration-blue-500/30">em vídeo.</span>
            </h1>
            <p className="text-zinc-400 text-xl mb-12 max-w-2xl mx-auto">
              Transforme ideias em vídeos cinematográficos ou Shorts com narração, imagens e trilha sonora em instantes.
            </p>
            
            <div className="w-full space-y-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-blue-600 rounded-3xl opacity-20 group-hover:opacity-40 blur transition-all duration-500"></div>
                <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-2 flex items-start gap-2 shadow-2xl">
                  <textarea 
                    value={topic} 
                    onChange={e => setTopic(e.target.value)} 
                    placeholder="Cole aqui seu tema, roteiro ou ideia detalhada. A IA cuidará de todo o resto..." 
                    className="flex-1 bg-transparent p-4 outline-none text-lg text-white placeholder-zinc-600 resize-none h-28 custom-scroll scrollbar-hide"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        startScript();
                      }
                    }}
                  />
                  <button onClick={() => startScript()} className="bg-white text-black p-4 rounded-2xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-lg mt-2 mr-2 shrink-0">
                    <ArrowRight size={28} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="absolute -bottom-6 left-6 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Pressione Enter para gerar • Shift+Enter para nova linha</div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-inner">
                  {FORMATS.map(f => (
                    <button 
                      key={f.id} 
                      onClick={() => setSelectedFormat(f.id as any)} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFormat === f.id ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <f.icon size={16} /> {f.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <select 
                  value={selectedMusic} 
                  onChange={e => setSelectedMusic(e.target.value)} 
                  className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-sm outline-none text-zinc-300 hover:border-zinc-700 transition cursor-pointer"
                >
                  {MUSIC_LIBRARY.map(m => (
                    <option key={m.id} value={m.id}>{m.id === 'none' ? 'Sem Música' : `Música: ${m.name}`}</option>
                  ))}
                </select>
                <select 
                  value={subtitleSize} 
                  onChange={e => setSubtitleSize(Number(e.target.value))} 
                  className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-sm outline-none text-zinc-300 hover:border-zinc-700 transition cursor-pointer"
                >
                  {FONT_SIZES.map(f => (
                    <option key={f.value} value={f.value}>Legenda: {f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {INSPIRATION_EXAMPLES.map((ex, i) => (
                <div key={i} onClick={() => startScript(ex.title)} className="aspect-video rounded-2xl overflow-hidden relative cursor-pointer group border border-zinc-800 hover:border-blue-500 transition-all duration-300">
                  <img src={ex.img} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end text-left">
                    <p className="font-bold text-sm text-white group-hover:translate-y-[-2px] transition-transform">{ex.title}</p>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{ex.style}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
              <Loader2 className="animate-spin text-blue-500 mb-8 relative" size={80} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Criando Roteiro...</h2>
            <p className="text-zinc-500 max-w-xs text-center">Inspirando a IA a escrever as melhores cenas para sua história.</p>
          </div>
        )}

        {project && !loading && (
          <div className="flex-1 flex p-8 gap-8 max-w-[1600px] mx-auto w-full animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <aside className="w-80 space-y-6 shrink-0 overflow-y-auto pr-2 custom-scroll">
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Projeto Atual</h3>
                  <div className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/20">FLASH 2.5</div>
                </div>
                <h2 className="text-xl font-bold mb-2 leading-snug text-white">{project.title}</h2>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-6 bg-black/20 px-3 py-1.5 rounded-lg w-fit">
                  {project.aspectRatio === '9:16' ? <Smartphone size={14} /> : <Monitor size={14} />} 
                  {project.aspectRatio === '9:16' ? '9:16 Portrait' : '16:9 HD'}
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed italic border-l-2 border-zinc-800 pl-4">"{project.description}"</p>
              </div>
              <div className="flex flex-col bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-lg">
                <button 
                  onClick={() => setTab('workflow')} 
                  className={`p-4 rounded-xl text-left text-sm font-bold transition-all ${tab === 'workflow' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${tab === 'workflow' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>1</span>
                    Revisar Roteiro
                  </div>
                </button>
                <button 
                  onClick={() => setTab('production')} 
                  className={`p-4 rounded-xl text-left text-sm font-bold transition-all ${tab === 'production' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                   <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${tab === 'production' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>2</span>
                    Estúdio de Geração
                  </div>
                </button>
              </div>
            </aside>

            <section className="flex-1 flex flex-col bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl backdrop-blur-sm relative">
              {tab === 'workflow' ? (
                <div className="flex-1 flex flex-col p-10 overflow-y-auto custom-scroll">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-4xl font-bold tracking-tight mb-2 text-white">Roteiro Sugerido</h2>
                      <p className="text-zinc-500">Verifique as cenas e ouça as narrações antes de produzir.</p>
                    </div>
                    <button 
                      onClick={produce} 
                      className="bg-blue-600 px-10 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-900/40 text-white"
                    >
                      <Wand2 size={20} /> Iniciar Produção
                    </button>
                  </div>
                  <div className="space-y-6 pb-12">
                    {project.scenes.map((s, i) => (
                      <div key={i} className="bg-zinc-900/80 p-8 rounded-3xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold bg-blue-600/10 border border-blue-600/20 px-3 py-1 rounded-full text-blue-500 uppercase tracking-widest">Cena {i+1}</span>
                            <span className="text-zinc-700 font-mono text-xs">Aprox. {s.duration_est}s</span>
                          </div>
                          <button 
                            onClick={() => previewAudio(i)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${playingAudioId === i ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                          >
                            {loadingAudioId === i ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : playingAudioId === i ? (
                              <Pause size={14} fill="currentColor" />
                            ) : (
                              <Volume2 size={14} />
                            )}
                            {loadingAudioId === i ? 'Gerando Áudio...' : playingAudioId === i ? 'Tocando' : 'Ouvir Narração'}
                          </button>
                        </div>
                        <p className="text-xl font-medium mb-6 text-zinc-200 leading-relaxed group-hover:text-white transition-colors">"{s.narration}"</p>
                        <div className="bg-black/40 p-5 rounded-2xl text-sm text-zinc-500 flex items-start gap-4">
                          <ImageIcon size={18} className="shrink-0 mt-0.5 text-zinc-700" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-zinc-600 block">Prompt Visual</span>
                            <span className="whitespace-pre-wrap">{s.visual_prompt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-10 overflow-y-auto custom-scroll">
                   <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-colors ${project.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {project.status === 'completed' ? <Check size={32} /> : <Loader2 className="animate-spin" size={32} />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">{project.status === 'completed' ? 'Produção Concluída' : 'Produzindo Ativos...'}</h2>
                        {prodStartTime && (
                          <div className="text-sm font-mono text-zinc-500 flex items-center gap-2 mt-1">
                            <Hourglass size={14} /> Tempo Decorrido: <Timer startTime={prodStartTime} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      {project.status === 'completed' && !project.videoBlob && (
                        <button 
                          onClick={async () => { setRendering(true); const b = await renderVideo(project, subtitleSize, setRenderProgress); setProject(p => p ? {...p, videoBlob: b} : null); setRendering(false); }} 
                          className="bg-blue-600 px-10 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-900/40 text-white"
                        >
                          {rendering ? <Loader2 className="animate-spin" /> : <Settings />} 
                          {rendering ? `Compilando ${Math.round(renderProgress)}%` : "Montar Vídeo Final"}
                        </button>
                      )}
                      {project.videoBlob && (
                        <>
                          <button onClick={() => setShowPlayer(true)} className="bg-zinc-800 px-8 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-700 transition-all text-white"><Play fill="currentColor" size={18} /> Assistir</button>
                          <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(project.videoBlob!); a.download = `${project.title.replace(/\s+/g, '_')}.mp4`; a.click(); }} className="bg-white text-black px-8 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-all shadow-lg"><Download size={18} /> Baixar</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                    {project.scenes.map((s, i) => (
                      <div key={i} className={`group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-zinc-600 ${project.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                        {s.imageUrl ? (
                          <img src={s.imageUrl} className="w-full h-full object-cover transition duration-1000 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-zinc-950 p-8 text-center">
                            {s.status === 'error' ? (
                              <div className="animate-in zoom-in duration-300 flex flex-col items-center gap-3">
                                <AlertCircle className="text-red-500" size={40} />
                                <span className="text-xs text-red-500 uppercase font-bold tracking-tighter">Erro na Cota</span>
                                <p className="text-[10px] text-zinc-600">Falha persistente após 10 tentativas.</p>
                              </div>
                            ) : s.status === 'retrying' ? (
                              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
                                <Clock className="animate-pulse text-amber-500" size={40} />
                                <div className="space-y-3">
                                  <span className="text-[10px] text-amber-500 uppercase font-bold tracking-[0.2em] block">
                                    Limite Atingido
                                  </span>
                                  <div className="flex flex-col gap-1 items-center">
                                    <p className="text-[10px] text-zinc-500">Aguardando cota da API...</p>
                                    <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-[9px] font-mono">
                                      RETENTANDO EM {s.retryWait}S
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                                  <Loader2 className={`animate-spin relative ${s.status === 'pending' ? 'text-zinc-800' : 'text-blue-500'}`} size={40} />
                                </div>
                                <div className="space-y-3">
                                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] block">
                                    {s.status === 'pending' ? 'Fila de Espera' : 'Processando'}
                                  </span>
                                  <div className="h-1.5 w-32 bg-zinc-900 rounded-full overflow-hidden shadow-inner border border-zinc-800">
                                    <div 
                                      className={`h-full bg-blue-600 transition-all duration-700 shadow-[0_0_10px_rgba(37,99,235,0.5)] ${s.status === 'pending' ? 'w-0' : 'w-2/3'}`}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold border border-white/10 shadow-lg tracking-widest text-white">CENA {i+1}</div>
                        {s.imageUrl && (
                           <div className="absolute bottom-4 right-4 bg-green-500 text-black p-1.5 rounded-full shadow-lg">
                              <Check size={14} strokeWidth={3} />
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="h-12 border-t border-zinc-900 flex items-center justify-center px-8 text-[10px] text-zinc-600 uppercase tracking-[0.3em]">
        © 2025 AutoVideo Studio • AI Production Lab
      </footer>
      
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);