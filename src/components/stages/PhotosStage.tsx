import { useRef, useState, useEffect } from 'react';
import type { useWindowData } from '@/hooks/useWindowData';
import { Card, Button, Select, TextInput, EmptyState } from '@/components/ui';
import { fileToDataUrl } from '@/lib/image';
import { Camera, ImagePlus, Trash2, X } from 'lucide-react';

type Data = ReturnType<typeof useWindowData>;

const CATEGORIES = ['outside', 'inside', 'head', 'cill', 'obstruction', 'other'] as const;

export default function PhotosStage({ data }: { data: Data }) {
  const { win, addPhoto, updatePhoto, removePhoto } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photos = win?.photos ?? [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        await addPhoto(dataUrl, 'outside', '');
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle title="Photos & Notes" subtitle="Attach photographs and site notes to this window" />

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Add Photographs</h3>
        <div className="flex flex-wrap gap-3">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button variant="primary" onClick={() => cameraRef.current?.click()} className="flex items-center gap-2">
            <Camera className="w-5 h-5" /> Take Photo
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5" /> From Library
          </Button>
          {uploading && <span className="text-sm text-amber-600 self-center">Uploading…</span>}
        </div>
      </Card>

      {photos.length === 0 ? (
        <EmptyState icon={<ImagePlus className="w-12 h-12" />} title="No photos yet" subtitle="Photos help record site conditions and obstructions." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative aspect-square bg-slate-100">
                <img src={p.image_data} alt={p.caption ?? ''} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600 touch-manipulation"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="absolute top-2 left-2 text-xs font-semibold uppercase tracking-wide bg-slate-900/80 text-white px-2 py-0.5 rounded">
                  {p.category || 'other'}
                </span>
                {p.sync_status === 'pending_upload' && (
                  <span className="absolute bottom-2 left-2 text-xs font-medium bg-amber-500/90 text-white px-2 py-0.5 rounded">
                    Pending upload
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2">
                <Select
                  value={p.category ?? 'other'}
                  onChange={(e) => updatePhoto(p.id, { category: e.target.value })}
                  className="text-sm py-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <TextInput
                  value={p.caption ?? ''}
                  onChange={(e) => updatePhoto(p.id, { caption: e.target.value })}
                  placeholder="Caption"
                  className="text-sm py-2"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Site / Fitting Notes</h3>
        <p className="text-sm text-slate-500 mb-4">Record tiles, render, pipes, cables, fascias, obstructions and any other site condition.</p>
        <SiteNotesEditor data={data} />
      </Card>
    </div>
  );
}

function SiteNotesEditor({ data }: { data: Data }) {
  const { win, saveSpecification } = data;
  const notes = win?.specification?.site_notes ?? '';
  const [text, setText] = useState(notes);

  useEffect(() => {
    setText(notes);
  }, [notes]);

  function onChange(v: string) {
    setText(v);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveSpecification({ site_notes: v }), 600);
  }

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      rows={6}
      placeholder="Tiles, render, existing trims, pipes, cables, fascias, internal finishes, external obstructions…"
      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition resize-y"
    />
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}
