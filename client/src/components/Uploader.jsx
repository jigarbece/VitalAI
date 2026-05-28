import React, { useCallback, useRef, useState } from 'react';
import { useToast } from '../toast.jsx';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(file) {
  if (!file) return 'Please choose a file.';
  const name = (file.name || '').toLowerCase();
  const okExt = ACCEPTED_EXTS.some((e) => name.endsWith(e));
  const okType = ACCEPTED_TYPES.includes(file.type);
  if (!okExt && !okType) return 'Unsupported file type. Use PDF, JPG, or PNG.';
  if (file.size > MAX_BYTES) return 'File is larger than 10MB.';
  return null;
}

export default function Uploader({ file, onFileSelected, onNext, onBack }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const { show } = useToast();

  const handleFile = useCallback(
    (chosen) => {
      const err = validateFile(chosen);
      if (err) {
        show(err, 'error');
        return;
      }
      // simulate a brief upload progress for UX (file already in memory)
      setProgress(0);
      const start = Date.now();
      const tick = () => {
        const pct = Math.min(100, ((Date.now() - start) / 600) * 100);
        setProgress(pct);
        if (pct < 100) requestAnimationFrame(tick);
        else onFileSelected(chosen);
      };
      requestAnimationFrame(tick);
    },
    [onFileSelected, show]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const onPick = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const isImage = file && file.type && file.type.startsWith('image/');
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <section className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Step 1 · Upload your blood report</h2>
        <p className="text-white/60 mt-2">PDF, JPG, or PNG · up to 10MB. The file never leaves this session.</p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload blood report file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`card p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-teal bg-teal/5 scale-[1.01]' : 'hover:border-white/25'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={onPick}
          data-testid="file-input"
        />

        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal/10 border border-teal/30 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="text-lg font-semibold">Drop your report here</p>
        <p className="text-sm text-white/50 mt-1">or click to browse</p>
        <p className="text-xs text-white/30 mt-3">PDF · JPG · PNG · max 10MB</p>
      </div>

      {file && progress < 100 && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/60 mb-1.5">
            <span>Preparing {file.name}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-teal transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {file && progress >= 100 && (
        <div className="mt-5 card p-4 flex items-center gap-4 animate-slide-up" data-testid="file-preview">
          {previewUrl ? (
            <img src={previewUrl} alt="report preview" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-300 font-bold">
              PDF
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{file.name}</div>
            <div className="text-xs text-white/50">{(file.size / 1024).toFixed(1)} KB · ready</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFileSelected(null); setProgress(0); }}
            className="text-white/50 hover:text-white text-xs"
            aria-label="Remove file"
          >
            Remove
          </button>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="btn-ghost">← Back</button>
        <button
          onClick={onNext}
          disabled={!file || progress < 100}
          className="btn-primary"
        >
          Next: Your Profile →
        </button>
      </div>
    </section>
  );
}
