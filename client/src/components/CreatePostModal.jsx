import { useState, useRef, useEffect } from 'react';
import { X, Upload, Image, Film, Sparkles, Loader2, ArrowLeft, Trash2, Wand2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function CreatePostModal({ onClose, onCreated, credits, onBuyCredits }) {
  const [tab, setTab] = useState('upload');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('select');
  const [prompt, setPrompt] = useState('');
  const [genType, setGenType] = useState('image');
  const [models, setModels] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [generatedModel, setGeneratedModel] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [captioning, setCaptioning] = useState(false);
  const [captionSub, setCaptionSub] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/caption/status').then(({ data }) => setCaptionSub(data)).catch(() => {});
  }, []);

  const loadModels = async () => { if (models) return; try { const { data } = await api.get('/generate/models'); setModels(data); } catch {} };
  const handleTabSwitch = (t) => { setTab(t); if (t === 'generate') loadModels(); };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const newFiles = [...files, ...selected].slice(0, 20);
    setFiles(newFiles);
    setPreviews(newFiles.map(f => ({ url: URL.createObjectURL(f), type: f.type.startsWith('video/') ? 'video' : 'image' })));
    setStep('caption');
  };

  const removeFile = (idx) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setPreviews(prev => prev.filter((_, i) => i !== idx));
    setFiles(newFiles);
    if (newFiles.length === 0) setStep('select');
  };

  const handleAutoCaption = async () => {
    if (captioning) return;
    setCaptioning(true);
    try {
      let imageUrl;
      if (tab === 'upload' && files.length > 0) {
        const form = new FormData(); form.append('media', files[0]);
        const { data: uploadData } = await api.post('/posts/upload-temp', form);
        imageUrl = uploadData.url;
      } else if (generatedUrl) {
        imageUrl = generatedUrl;
      }
      if (!imageUrl) { toast.error('No image to analyze'); return; }

      const { data } = await api.post('/caption/generate', { imageUrl });
      setCaption(data.title ? `${data.title}\n\n${data.description}` : data.description);
      if (data.usage) setCaptionSub(prev => prev ? { ...prev, usage: data.usage } : prev);
      toast.success(`Caption generated! (${data.usage?.remaining ?? '?'} left this month)`);
    } catch (err) {
      if (err.response?.data?.limitReached) {
        toast.error(err.response.data.message);
      } else {
        toast.error(err.response?.data?.error || 'Failed to generate caption');
      }
    } finally { setCaptioning(false); }
  };

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
    if (submitting) return;
    if (tab === 'upload' && files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    if (tab === 'generate' && !generatedUrl) {
      toast.error('Please generate media first');
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);
    const progressConfig = {
      onUploadProgress: (e) => {
        const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
        setUploadProgress(pct);
      },
    };
    try {
      if (tab === 'upload') {
        const form = new FormData();
        if (files.length === 1) {
          form.append('media', files[0]);
          form.append('caption', caption);
          await api.post('/posts', form, progressConfig);
        } else {
          files.forEach(f => form.append('media', f));
          form.append('caption', caption);
          await api.post('/posts/batch', form, progressConfig);
        }
      } else if (tab === 'generate' && generatedUrl) {
        await api.post('/posts', { mediaUrl: generatedUrl, mediaType, caption, aiModel: generatedModel, aiPrompt: prompt });
      }
      setUploadProgress(100);
      toast.success(files.length > 1 ? `${files.length} creations uploaded!` : 'Uploaded!');
      onCreated?.(); onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed — please try again';
      toast.error(msg);
      console.error('Upload error:', err);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const hasMedia = tab === 'upload' ? files.length > 0 : !!generatedUrl;
  const usage = captionSub?.usage;
  const limitReached = usage && usage.remaining <= 0;

  const AutoCaptionButton = () => (
    <div className="mt-3 pt-3 border-t border-surface-3">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={handleAutoCaption} disabled={captioning || limitReached}
          className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-40">
          {captioning ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          {captioning ? 'Generating...' : limitReached ? 'Monthly limit reached' : 'Auto Caption with AI'}
        </button>
        {usage && (
          <span className="text-[10px] text-ink-faint">{usage.remaining}/{usage.limit} left</span>
        )}
      </div>
      {limitReached && (
        <p className="text-[10px] text-amber-600 mb-1">You've used all 100 AI captions this month. Resets on the 1st.</p>
      )}
      <p className="text-[10px] text-ink-faint mt-1 leading-relaxed">
        Writing your own captions is always free. AI captioning is limited to {usage?.limit ?? 100}/month.
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-0 rounded-2xl shadow-modal overflow-hidden animate-slide-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between h-12 border-b border-surface-3 px-4 shrink-0">
          {step === 'caption' ? (
            <button onClick={() => setStep('select')} className="text-ink-muted hover:text-ink transition-colors"><ArrowLeft size={20} /></button>
          ) : <div />}
          <h2 className="text-sm font-bold">New Creation</h2>
          {step === 'caption' && hasMedia ? (
            <button onClick={handleSubmit} disabled={submitting} className="text-accent-violet text-sm font-bold hover:opacity-80 disabled:opacity-40 transition-opacity">
              {submitting ? `${uploadProgress < 100 ? `${uploadProgress}%` : 'Processing...'}` : 'Upload'}
            </button>
          ) : (
            <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={20} /></button>
          )}
        </div>

        {submitting && tab === 'upload' && (
          <div className="px-4 pt-2 pb-1 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-ink-muted">
                {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
              </span>
              <span className="text-[11px] font-semibold text-accent-violet">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-violet rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {files.length > 1 && (
              <p className="text-[10px] text-ink-faint mt-1">{files.length} files • {(files.reduce((a, f) => a + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total</p>
            )}
          </div>
        )}

        {step === 'select' ? (
          <>
            <div className="flex border-b border-surface-3 shrink-0">
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
            <div className="p-5 overflow-y-auto">
              {tab === 'upload' ? (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-surface-4 hover:border-accent-violet/40 hover:bg-violet-50/30 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <Upload size={24} className="text-accent-violet" />
                  </div>
                  <p className="text-sm text-ink-light font-medium">Click to upload</p>
                  <p className="text-xs text-ink-faint">Select multiple images & videos (up to 20)</p>
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
                      <span>Cost: <strong className="text-ink">{genType === 'video' ? 5 : 1}</strong> {genType === 'video' ? 'credits' : 'credit'}</span>
                      <span>Balance: <strong className={credits < (genType === 'video' ? 5 : 1) ? 'text-like' : 'text-accent-violet'}>{credits}</strong></span>
                    </div>
                  )}
                  {credits !== null && credits !== undefined && credits < (genType === 'video' ? 5 : 1) ? (
                    <button onClick={onBuyCredits} className="btn-primary w-full flex items-center justify-center gap-2">
                      Buy Credits
                    </button>
                  ) : (
                    <button onClick={handleGenerate} disabled={!prompt.trim() || generating}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate ({genType === 'video' ? 5 : 1} cr)</>}
                    </button>
                  )}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {tab === 'upload' && files.length > 1 ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-muted">{files.length} files selected</p>
                  <button onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-accent-violet hover:opacity-80">
                    + Add more
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-surface-2 group">
                      {p.type === 'video' ? (
                        <video src={p.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                      {p.type === 'video' && (
                        <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-[10px] text-white font-medium">
                          <Film size={10} className="inline mr-0.5" />VID
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption for all..."
                  rows={3} className="input-field resize-none" maxLength={2200} />
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-ink-faint">{caption.length}/2,200</div>
                </div>
                <AutoCaptionButton />
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-1/2 bg-surface-1 flex items-center justify-center min-h-[280px] p-3">
                  {tab === 'upload' && previews[0] ? (
                    previews[0].type === 'video' ? (
                      <video src={previews[0].url} controls className="max-w-full max-h-[320px] object-contain rounded-lg" />
                    ) : (
                      <img src={previews[0].url} alt="" className="max-w-full max-h-[320px] object-contain rounded-lg" />
                    )
                  ) : generatedUrl ? (
                    mediaType === 'video' ? (
                      <video src={generatedUrl} controls className="max-w-full max-h-[320px] object-contain rounded-lg" />
                    ) : (
                      <img src={generatedUrl} alt="" className="max-w-full max-h-[320px] object-contain rounded-lg" />
                    )
                  ) : null}
                </div>
                <div className="sm:w-1/2 p-4 flex flex-col border-l border-surface-3">
                  <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..."
                    rows={6} className="flex-1 bg-transparent text-sm placeholder-ink-faint focus:outline-none resize-none" maxLength={2200} />
                  <div className="text-right text-[11px] text-ink-faint">{caption.length}/2,200</div>
                  <AutoCaptionButton />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
