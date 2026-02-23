import { useState, useRef } from 'react';
import { X, Upload, Image, Film, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function CreatePostModal({ onClose, onCreated, credits, onBuyCredits }) {
  const [tab, setTab] = useState('upload');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('select');
  const [prompt, setPrompt] = useState('');
  const [genType, setGenType] = useState('image');
  const [models, setModels] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [generatedModel, setGeneratedModel] = useState('');
  const fileRef = useRef(null);

  const loadModels = async () => { if (models) return; try { const { data } = await api.get('/generate/models'); setModels(data); } catch {} };
  const handleTabSwitch = (t) => { setTab(t); if (t === 'generate') loadModels(); };

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setMediaType(f.type.startsWith('video/') ? 'video' : 'image');
    setPreview(URL.createObjectURL(f)); setStep('caption');
  };

  const creditCost = genType === 'video' ? 5 : 1;
  const notEnoughCredits = credits !== null && credits !== undefined && credits < creditCost;

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true); setGeneratedUrl(null);
    try {
      const { data } = await api.post(genType === 'video' ? '/generate/video' : '/generate/image', { prompt: prompt.trim(), model: selectedModel || undefined });
      setGeneratedUrl(data.url); setGeneratedModel(data.model); setMediaType(genType); setStep('caption');
      toast.success('Generated!');
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Not enough credits');
        if (onBuyCredits) onBuyCredits();
        return;
      }
      toast.error(err.response?.data?.error || 'Failed');
    }
    finally { setGenerating(false); }
  };

  const handleSubmit = async () => {
    if (submitting) return; setSubmitting(true);
    try {
      if (tab === 'upload' && file) {
        const form = new FormData(); form.append('media', file); form.append('caption', caption);
        await api.post('/posts', form);
      } else if (tab === 'generate' && generatedUrl) {
        await api.post('/posts', { mediaUrl: generatedUrl, mediaType, caption, aiModel: generatedModel, aiPrompt: prompt });
      }
      toast.success('Shared!'); onCreated?.(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const hasMedia = tab === 'upload' ? !!file : !!generatedUrl;
  const mediaPreview = tab === 'upload' ? preview : generatedUrl;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-0 rounded-2xl shadow-modal overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between h-12 border-b border-surface-3 px-4">
          {step === 'caption' ? (
            <button onClick={() => setStep('select')} className="text-ink-muted hover:text-ink transition-colors"><ArrowLeft size={20} /></button>
          ) : <div />}
          <h2 className="text-sm font-bold">New Creation</h2>
          {step === 'caption' && hasMedia ? (
            <button onClick={handleSubmit} disabled={submitting} className="text-accent-violet text-sm font-bold hover:opacity-80 disabled:opacity-40 transition-opacity">
              {submitting ? 'Sharing...' : 'Share'}
            </button>
          ) : (
            <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={20} /></button>
          )}
        </div>

        {step === 'select' ? (
          <>
            <div className="flex border-b border-surface-3">
              <button onClick={() => handleTabSwitch('upload')}
                className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 -mb-px
                  ${tab === 'upload' ? 'text-accent-violet border-accent-violet' : 'text-ink-faint border-transparent'}`}>
                <Upload size={15} /> Upload
              </button>
              <button onClick={() => handleTabSwitch('generate')}
                className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 -mb-px
                  ${tab === 'generate' ? 'text-accent-violet border-accent-violet' : 'text-ink-faint border-transparent'}`}>
                <Sparkles size={15} /> Generate
              </button>
            </div>
            <div className="p-5">
              {tab === 'upload' ? (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-surface-4 hover:border-accent-violet/40 hover:bg-violet-50/30 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <Upload size={24} className="text-accent-violet" />
                  </div>
                  <p className="text-sm text-ink-light font-medium">Click to upload</p>
                  <p className="text-xs text-ink-faint">Images & videos up to 100MB</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => setGenType('image')}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all
                        ${genType === 'image' ? 'bg-accent-violet text-white' : 'bg-surface-2 text-ink-muted hover:bg-surface-3'}`}>
                      <Image size={15} /> Image
                    </button>
                    <button onClick={() => setGenType('video')}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all
                        ${genType === 'video' ? 'bg-accent-violet text-white' : 'bg-surface-2 text-ink-muted hover:bg-surface-3'}`}>
                      <Film size={15} /> Video
                    </button>
                  </div>
                  {models && (
                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="input-field">
                      <option value="">Default model</option>
                      {(genType === 'image' ? models.image : models.video).map(m => (
                        <option key={m.id} value={m.id}>{m.name} — {m.description}</option>
                      ))}
                    </select>
                  )}
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder={`Describe the ${genType} you want to create...`} rows={3} className="input-field resize-none" />
                  {credits !== null && credits !== undefined && (
                    <div className="flex items-center justify-between text-xs text-ink-faint px-1">
                      <span>Cost: <strong className="text-ink">{creditCost}</strong> {creditCost === 1 ? 'credit' : 'credits'}</span>
                      <span>Balance: <strong className={credits < creditCost ? 'text-like' : 'text-accent-violet'}>{credits}</strong></span>
                    </div>
                  )}
                  {notEnoughCredits ? (
                    <button onClick={onBuyCredits} className="btn-primary w-full flex items-center justify-center gap-2">
                      Buy Credits
                    </button>
                  ) : (
                    <button onClick={handleGenerate} disabled={!prompt.trim() || generating}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate ({creditCost} cr)</>}
                    </button>
                  )}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
          </>
        ) : (
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-1/2 bg-surface-1 flex items-center justify-center min-h-[280px] p-3">
              {mediaType === 'video' ? (
                <video src={mediaPreview} controls className="max-w-full max-h-[320px] object-contain rounded-lg" />
              ) : (
                <img src={mediaPreview} alt="" className="max-w-full max-h-[320px] object-contain rounded-lg" />
              )}
            </div>
            <div className="sm:w-1/2 p-4 flex flex-col border-l border-surface-3">
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..."
                rows={6} className="flex-1 bg-transparent text-sm placeholder-ink-faint focus:outline-none resize-none" maxLength={2200} />
              <div className="text-right text-[11px] text-ink-faint">{caption.length}/2,200</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
