import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
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
  Copy
} from 'lucide-react';

// --- TYPES ---

type Scene = {
  id: number;
  visual_prompt: string;
  narration: string;
  duration_est: number;
};

type VideoProject = {
  title: string;
  description: string;
  tags: string[];
  scenes: Scene[];
  topic: string;
  status: 'idle' | 'scripting' | 'review_script' | 'planning_media' | 'ready_for_code';
};

// --- GEMINI INTEGRATION ---

const generateScript = async (topic: string, duration: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemPrompt = `
  Você é um produtor de vídeos especialista em YouTube. Crie um roteiro de vídeo estruturado sobre "${topic}".
  Duração alvo: ${duration}.
  Idioma: Português (Brasil).
  
  A saída deve ser um objeto JSON com:
  1. title (título chamativo para YouTube em PT-BR)
  2. description (otimizada para SEO em PT-BR)
  3. tags (array de 10 strings em PT-BR)
  4. scenes (array de objetos), onde cada cena possui:
     - visual_prompt (Descrição visual em INGLÊS para Stable Diffusion/Flux, altamente detalhada, iluminação cinematográfica, 8k)
     - narration (O texto em Português para o motor TTS ler)
     - duration_est (duração estimada em segundos para esta cena, manter entre 4-8 segundos)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  visual_prompt: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  duration_est: { type: Type.NUMBER },
                }
              }
            }
          }
        }
      }
    });
    
    // Safety check for empty response
    if (!response.text) {
      throw new Error("Resposta da IA vazia");
    }
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erro ao gerar roteiro:", error);
    throw error;
  }
};

// --- CODE GENERATION TEMPLATES ---

const getPythonCode = (project: VideoProject) => {
  // Ensure we have arrays even if data is missing
  const scenesSafe = project.scenes || [];
  const tagsSafe = project.tags || [];

  const scenesJson = JSON.stringify(scenesSafe, null, 2);
  const metadataJson = JSON.stringify({
    title: project.title,
    description: project.description,
    tags: tagsSafe
  }, null, 2);

  return `
# --- SISTEMA DE VÍDEO AUTOMATIZADO ---
# Tema: ${project.topic}
# Gerado por AutoVideo Studio

import os
import json
import asyncio
import edge_tts # TTS Gratuito
from moviepy.editor import * # Edição de Vídeo
# Nota: Para imagens, usaremos um wrapper de API genérico hipotético ou Stable Diffusion local
# Você pode substituir 'generate_image' por chamadas à API de Inferência do HuggingFace (Plano gratuito)

# --- CONFIGURAÇÃO ---
PROJECT_DIR = "output_${project.topic.replace(/\s+/g, '_').toLowerCase()}"
os.makedirs(PROJECT_DIR, exist_ok=True)
os.makedirs(f"{PROJECT_DIR}/audio", exist_ok=True)
os.makedirs(f"{PROJECT_DIR}/images", exist_ok=True)

# --- DADOS ---
SCENES = ${scenesJson}

METADATA = ${metadataJson}

# --- 1. GERAÇÃO DE ÁUDIO (Edge TTS - Gratuito) ---
async def generate_audio():
    print("🎤 Gerando Narrações...")
    audio_files = []
    
    for i, scene in enumerate(SCENES):
        text = scene['narration']
        output_file = f"{PROJECT_DIR}/audio/scene_{i}.mp3"
        communicate = edge_tts.Communicate(text, "pt-BR-AntonioNeural") # Excelente voz gratuita
        await communicate.save(output_file)
        audio_files.append(output_file)
        print(f"  ✓ Cena {i} áudio gerado")
        
    return audio_files

# --- 2. GERAÇÃO DE IMAGENS (Placeholder / Hook de API) ---
def generate_images():
    print("🎨 Gerando Imagens...")
    image_files = []
    
    # INSTRUÇÃO: Substitua este loop pela sua API de Geração de Imagem GRATUITA preferida
    # Exemplo: API de Inferência HuggingFace com FLUX.1-dev ou Stable Diffusion
    
    for i, scene in enumerate(SCENES):
        prompt = scene['visual_prompt']
        output_file = f"{PROJECT_DIR}/images/scene_{i}.png"
        
        # IMPLEMENTAÇÃO MOCK (Gera uma imagem de cor sólida com texto para teste)
        # Em produção, descomente a chamada de API abaixo
        clip = ColorClip(size=(1920, 1080), color=(50, 50, 80), duration=5)
        txt = TextClip(f"Cena {i}\\n{prompt[:50]}...", fontsize=50, color='white')
        comp = CompositeVideoClip([clip, txt.set_position('center')])
        comp.save_frame(output_file, t=1)
        
        image_files.append(output_file)
        print(f"  ✓ Cena {i} imagem gerada (Placeholder)")
        
    return image_files

# --- 3. MONTAGEM DO VÍDEO (MoviePy) ---
def assemble_video(audio_paths, image_paths):
    print("🎬 Montando Vídeo...")
    clips = []
    
    for i, (audio_path, image_path) in enumerate(zip(audio_paths, image_paths)):
        # Carregar Áudio
        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration + 0.5 # Adicionar pequena pausa
        
        # Carregar Imagem & Aplicar leve efeito de Zoom (Ken Burns)
        img_clip = ImageClip(image_path).set_duration(duration)
        
        # Crossfade simples
        video_clip = img_clip.set_audio(audio_clip).crossfadein(0.5)
        clips.append(video_clip)
        
    final_video = concatenate_videoclips(clips, method="compose")
    
    # Adicionar Música de Fundo (Opcional - garanta que o arquivo exista)
    # bg_music = AudioFileClip("bg_music.mp3").volumex(0.1).loop(duration=final_video.duration)
    # final_video.audio = CompositeAudioClip([final_video.audio, bg_music])
    
    output_path = f"{PROJECT_DIR}/video_final.mp4"
    final_video.write_videofile(output_path, fps=24, codec="libx264", audio_codec="aac")
    print(f"✅ Vídeo pronto: {output_path}")
    return output_path

# --- 4. UPLOAD PARA YOUTUBE (Usando simple-youtube-api ou google-api-python-client oficial) ---
def upload_video(video_path):
    print(f"🚀 Pronto para upload no YouTube!")
    print(f"Título: {METADATA['title']}")
    print(f"Tags: {METADATA['tags']}")
    # Implementação requer arquivo JSON de Segredos do Cliente OAuth2.0.
    # Veja a documentação do 'google-api-python-client'

if __name__ == "__main__":
    loop = asyncio.get_event_loop_policy().get_event_loop()
    try:
        audio_files = loop.run_until_complete(generate_audio())
        image_files = generate_images()
        final_video = assemble_video(audio_files, image_files)
        # upload_video(final_video)
    finally:
        loop.close()
`;
};

const getRequirementsTxt = () => `
edge-tts
moviepy==1.0.3
requests
google-api-python-client
google-auth-oauthlib
google-auth-httplib2
imageio-ffmpeg
`;

// --- COMPONENTS ---

const StepIcon = ({ step, current, icon: Icon }: any) => {
  const steps = ['idle', 'scripting', 'review_script', 'planning_media', 'ready_for_code'];
  const currentIndex = steps.indexOf(current);
  const stepIndex = steps.indexOf(step);
  
  let statusColor = "text-zinc-600 bg-zinc-900 border-zinc-800";
  if (stepIndex === currentIndex) statusColor = "text-blue-400 bg-blue-950/30 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
  if (stepIndex < currentIndex) statusColor = "text-green-400 bg-green-950/30 border-green-500/50";

  return (
    <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${statusColor}`}>
      {stepIndex < currentIndex ? <CheckCircle2 size={20} /> : <Icon size={20} />}
    </div>
  );
};

const CodeBlock = ({ title, code, lang }: { title: string, code: string, lang: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden mb-4">
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400 uppercase">{title}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <div className="p-4 overflow-x-auto code-scroll">
        <pre className="text-sm font-mono text-zinc-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const App = () => {
  const [topic, setTopic] = useState("A história do café em 3 minutos");
  const [duration, setDuration] = useState("3 a 5 minutos");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [activeTab, setActiveTab] = useState<'workflow' | 'code'>('workflow');

  const startProcess = async () => {
    setLoading(true);
    // Initialize with safe empty arrays
    setProject({ 
      title: "Gerando...", 
      description: "", 
      tags: [], 
      scenes: [], 
      topic, 
      status: 'scripting' 
    });

    try {
      const scriptData = await generateScript(topic, duration);
      // Validate structure before setting state
      setProject({
        title: scriptData.title || "Sem Título",
        description: scriptData.description || "",
        tags: Array.isArray(scriptData.tags) ? scriptData.tags : [],
        scenes: Array.isArray(scriptData.scenes) ? scriptData.scenes : [],
        topic,
        status: 'review_script'
      });
    } catch (e) {
      alert("Erro ao gerar roteiro. Tente novamente.");
      // Reset project on error so we don't show broken state
      setProject(null); 
    } finally {
      setLoading(false);
    }
  };

  const proceedToCode = () => {
    if (project) {
      setProject({ ...project, status: 'ready_for_code' });
      setActiveTab('code');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Film size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-white">AutoVideo <span className="text-blue-500">Studio</span></h1>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Gemini 2.5 Flash Ativo
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-12 gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="col-span-12 lg:col-span-3 space-y-8">
          
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Progresso do Workflow</h2>
            <div className="space-y-6 relative">
              {/* Vertical Line */}
              <div className="absolute left-5 top-4 bottom-4 w-px bg-zinc-800 -z-10"></div>
              
              <div className="flex items-center gap-4">
                <StepIcon step="idle" current={project?.status || 'idle'} icon={Clapperboard} />
                <div>
                  <p className="text-sm font-medium text-white">Tema & Setup</p>
                  <p className="text-xs text-zinc-500">Defina sua ideia</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <StepIcon step="scripting" current={project?.status || 'idle'} icon={FileText} />
                <div>
                  <p className="text-sm font-medium text-white">Roteirização IA</p>
                  <p className="text-xs text-zinc-500">Storyboard</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StepIcon step="review_script" current={project?.status || 'idle'} icon={Settings} />
                <div>
                  <p className="text-sm font-medium text-white">Revisão</p>
                  <p className="text-xs text-zinc-500">Editar narração</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StepIcon step="ready_for_code" current={project?.status || 'idle'} icon={Code} />
                <div>
                  <p className="text-sm font-medium text-white">Geração do Sistema</p>
                  <p className="text-xs text-zinc-500">Python & Deploy</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-xl border border-blue-500/10 p-6">
            <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
              <Cpu size={16} /> Especificações
            </h3>
            <ul className="text-xs text-zinc-400 space-y-2">
              <li className="flex justify-between"><span>IA de Roteiro:</span> <span className="text-white">Gemini 2.5 Flash</span></li>
              <li className="flex justify-between"><span>Motor TTS:</span> <span className="text-white">Edge-TTS (Grátis)</span></li>
              <li className="flex justify-between"><span>Motor de Vídeo:</span> <span className="text-white">MoviePy + FFmpeg</span></li>
              <li className="flex justify-between"><span>Plataforma:</span> <span className="text-white">Python 3.10+</span></li>
            </ul>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="col-span-12 lg:col-span-9 bg-zinc-900/30 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col min-h-[600px]">
          
          {/* TABS */}
          {project?.status !== 'idle' && project?.status !== 'scripting' && (
            <div className="flex border-b border-zinc-800">
              <button 
                onClick={() => setActiveTab('workflow')}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'workflow' ? 'text-white border-b-2 border-blue-500 bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Espaço do Projeto
              </button>
              <button 
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'code' ? 'text-white border-b-2 border-blue-500 bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Código do Sistema
              </button>
            </div>
          )}

          {/* VIEW: INITIAL INPUT */}
          {!project && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-6">
                 <Youtube size={40} className="text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Qual vídeo você quer criar?</h2>
              <p className="text-zinc-400 max-w-md mb-8">
                Descreva seu tema. O sistema irá gerar um roteiro completo, plano de narração, prompts visuais e o código Python para construí-lo.
              </p>
              
              <div className="w-full max-w-lg space-y-4">
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="ex: O Futuro da IA em 2025"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                
                <div className="flex gap-4">
                  <select 
                     value={duration}
                     onChange={(e) => setDuration(e.target.value)}
                     className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                  >
                    <option value="3 a 5 minutos">3 a 5 Minutos</option>
                    <option value="1 minuto (Shorts)">1 Minuto (Shorts)</option>
                    <option value="10 minutos">10 Minutos (Aprofundado)</option>
                  </select>

                  <button 
                    onClick={startProcess}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                    Gerar Sistema
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: LOADING */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-6" />
              <h3 className="text-xl font-medium text-white">Projetando seu sistema de vídeo...</h3>
              <p className="text-zinc-500 mt-2">Escrevendo roteiro, criando prompts visuais e estruturando código.</p>
            </div>
          )}

          {/* VIEW: WORKSPACE */}
          {project && !loading && activeTab === 'workflow' && (
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Project Meta */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-zinc-500">Título do Vídeo</label>
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 font-medium">
                      {project.title}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-zinc-500">Tags Alvo</label>
                    <div className="flex flex-wrap gap-2">
                      {/* Safety check: ensure tags is array before slice */}
                      {(project.tags || []).slice(0, 5).map(tag => (
                        <span key={tag} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-500/20">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-xs uppercase font-bold text-zinc-500">Descrição</label>
                   <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 text-sm whitespace-pre-wrap">
                      {project.description}
                   </div>
                </div>

                {/* Scenes */}
                <div>
                   <div className="flex justify-between items-end mb-4">
                     {/* Safety check: ensure scenes is array for length */}
                     <label className="text-xs uppercase font-bold text-zinc-500">Storyboard ({(project.scenes || []).length} Cenas)</label>
                   </div>
                   
                   <div className="space-y-4">
                     {/* Safety check: ensure scenes is array before map */}
                     {(project.scenes || []).map((scene, idx) => (
                       <div key={idx} className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group">
                         <div className="flex gap-4 items-start">
                           <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-xs border border-zinc-800">
                             {idx + 1}
                           </div>
                           <div className="flex-1 grid grid-cols-2 gap-6">
                             <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <Mic size={14} className="text-blue-400" />
                                 <span className="text-xs font-semibold text-zinc-300">Narração (PT-BR)</span>
                               </div>
                               <p className="text-sm text-zinc-400 italic">"{scene.narration}"</p>
                             </div>
                             <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <ImageIcon size={14} className="text-purple-400" />
                                 <span className="text-xs font-semibold text-zinc-300">Prompt Visual</span>
                               </div>
                               <p className="text-xs text-zinc-500 font-mono bg-black/20 p-2 rounded border border-white/5">
                                 {scene.visual_prompt}
                               </p>
                             </div>
                           </div>
                           <div className="text-xs text-zinc-600 font-mono pt-1">
                             ~{scene.duration_est}s
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="pt-6 border-t border-zinc-800 flex justify-end">
                   <button 
                     onClick={proceedToCode}
                     className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                   >
                     <Code size={18} />
                     Gerar Sistema Python
                   </button>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: CODE */}
          {project && activeTab === 'code' && (
            <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#0d1117]">
              <div className="max-w-5xl mx-auto">
                 <div className="mb-8 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                   <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2">
                     <Download size={18} /> Sistema Pronto para Deploy
                   </h3>
                   <p className="text-sm text-blue-200/70">
                     Abaixo está o código-fonte completo para rodar este pipeline de geração de vídeo em sua máquina local ou servidor.
                     Ele usa <strong>Edge-TTS</strong> (Gratuito), <strong>MoviePy</strong> (Gratuito) e requer uma API para imagens (ou você pode trocar pelo Stable Diffusion local).
                   </p>
                 </div>

                 <CodeBlock 
                    title="main.py" 
                    lang="python" 
                    code={getPythonCode(project)} 
                 />

                 <div className="grid grid-cols-2 gap-6">
                   <CodeBlock 
                      title="requirements.txt" 
                      lang="text" 
                      code={getRequirementsTxt()} 
                   />
                   <CodeBlock 
                      title="docker-compose.yml" 
                      lang="yaml" 
                      code={`version: '3.8'
services:
  video-gen:
    build: .
    volumes:
      - ./output:/app/output
    command: python main.py
`} 
                   />
                 </div>
                 
                 <CodeBlock 
                    title="Dockerfile" 
                    lang="dockerfile" 
                    code={`FROM python:3.10-slim

# Install system dependencies for MoviePy/FFmpeg
RUN apt-get update && apt-get install -y \\
    ffmpeg \\
    imagemagick \\
    libsm6 \\
    libxext6 \\
    && rm -rf /var/lib/apt/lists/*

# Fix ImageMagick policy for MoviePy
RUN sed -i 's/none/read,write/g' /etc/ImageMagick-6/policy.xml

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
`} 
                 />

              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
