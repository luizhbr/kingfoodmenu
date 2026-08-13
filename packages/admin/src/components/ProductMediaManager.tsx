import { useRef, useState } from 'react';

interface GalleryImage {
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

interface Props {
  itemId: string;
  images: GalleryImage[];
  token: string;
  onChange: (images: GalleryImage[]) => void;
  apiUpload: (url: string, formData: FormData) => Promise<{ data: { image?: string; images?: GalleryImage[] } }>;
  apiPut: (url: string, body: unknown) => Promise<unknown>;
}

const RATIO = 4 / 3;
const TARGET_W = 800;
const TARGET_H = Math.round(800 / RATIO);

/**
 * Gerenciador de mídia do produto (UX-V5).
 * Crop client-side via canvas (sem libs), upload reaproveita POST /menu/items/:id/image,
 * ordem/principal/remoção via PUT /menu/items/:id/images.
 */
export default function ProductMediaManager({ itemId, images, token, onChange, apiUpload, apiPut }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropName, setCropName] = useState('');

  // Crop state
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const openPicker = () => fileRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!ok) {
      setError('Formato de imagem não suportado. Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem excede o tamanho permitido (5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result));
      setCropName(file.name);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    if (!cropSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Área visível do container (aspecto 4:3) — calcula o crop equivalente na imagem original
      const container = containerRef.current;
      const boxW = container ? container.clientWidth : 300;
      const boxH = boxW / RATIO;

      // Tamanho renderizado da imagem dentro do box com zoom
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let drawW = boxW * zoom;
      let drawH = boxH * zoom;
      if (imgAspect > boxW / boxH) {
        drawW = boxH * zoom * imgAspect;
        drawH = boxH * zoom;
      } else {
        drawH = boxW / imgAspect * zoom;
        drawW = boxW * zoom;
      }
      const drawX = (boxW - drawW) / 2 + offset.x;
      const drawY = (boxH - drawH) / 2 + offset.y;

      // Crop visível (em coordenadas da imagem original)
      const scaleX = img.naturalWidth / (boxW * zoom);
      const scaleY = img.naturalHeight / (boxH * zoom);
      const sx = Math.max(0, -drawX * scaleX);
      const sy = Math.max(0, -drawY * scaleY);
      const sw = Math.min(img.naturalWidth - sx, boxW * scaleX);
      const sh = Math.min(img.naturalHeight - sy, boxH * scaleY);

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setBusy(true);
        setError(null);
        try {
          const fd = new FormData();
          fd.append('image', blob, cropName || 'foto.jpg');
          const res = await apiUpload(`/menu/items/${itemId}/image`, fd);
          const next = res.data?.images ?? null;
          if (next) onChange(next);
          setCropSrc(null);
        } catch (err: any) {
          setError('Não foi possível enviar a imagem.');
        } finally {
          setBusy(false);
        }
      }, 'image/jpeg', 0.85);
    };
    img.src = cropSrc;
  };

  // Drag para reposicionar no crop
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const setPrimary = (index: number) => {
    const target = images[index];
    const next = images
      .filter((g) => g.url !== target.url)
      .map((g) => ({ ...g, isPrimary: false }));
    next.unshift({ ...target, isPrimary: true, sortOrder: 0 });
    persist(next.map((g, i) => ({ ...g, sortOrder: i })));
  };

  const remove = (index: number) => {
    if (images.length === 1) {
      setError('O produto precisa de pelo menos uma foto para manter a galeria. Para remover tudo, apague o produto ou edite manualmente.');
      return;
    }
    const next = images.filter((_, i) => i !== index);
    // Reindexar e manter a primeira como principal
    persist(next.map((g, i) => ({ ...g, sortOrder: i, isPrimary: i === 0 })));
  };

  const persist = async (next: GalleryImage[]) => {
    setBusy(true);
    setError(null);
    try {
      await apiPut(`/menu/items/${itemId}/images`, { images: next });
      onChange(next);
    } catch {
      setError('Não foi possível salvar as alterações.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Fotos do produto</h3>
        <p className="text-sm text-gray-500 mt-1">
          Adicione fotos horizontais do produto. A primeira foto será usada como principal.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg" role="alert">
          {error}
        </div>
      )}

      {/* Grade de fotos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <div key={img.url} className="relative group border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <div className="aspect-[4/3] w-full overflow-hidden">
              <img src={img.url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </div>
            {img.isPrimary && (
              <span className="absolute top-1.5 left-1.5 bg-[#FFD100] text-ink text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                Principal
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-center justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || busy}
                  className="w-8 h-8 rounded-lg bg-white/90 text-gray-800 text-sm font-bold disabled:opacity-40"
                  aria-label={`Mover foto ${i + 1} para cima`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1 || busy}
                  className="w-8 h-8 rounded-lg bg-white/90 text-gray-800 text-sm font-bold disabled:opacity-40"
                  aria-label={`Mover foto ${i + 1} para baixo`}
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPrimary(i)}
                disabled={img.isPrimary || busy}
                className="w-8 h-8 rounded-lg bg-white/90 text-amber-700 text-sm disabled:opacity-40"
                aria-label={`Definir foto ${i + 1} como principal`}
                title="Definir como principal"
              >
                ★
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={busy}
              className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50"
              aria-label={`Remover foto ${i + 1}`}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Adicionar */}
        <button
          type="button"
          onClick={openPicker}
          disabled={busy}
          className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 hover:border-[#FFD100] hover:bg-[#FFD100]/5 flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-ink transition-colors disabled:opacity-50"
        >
          <span className="text-2xl leading-none" aria-hidden>＋</span>
          <span className="text-xs font-semibold">{busy ? 'Enviando...' : 'Adicionar foto'}</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
        aria-hidden
      />

      {/* Modal de crop */}
      {cropSrc && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h4 className="font-bold text-gray-900">Editar foto</h4>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="w-11 h-11 rounded-full bg-gray-100 text-gray-700"
                aria-label="Fechar editor"
              >
                ✕
              </button>
            </div>

            {/* Área de crop 4:3 com zoom + drag */}
            <div className="px-5 py-4">
              <div
                ref={containerRef}
                className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 touch-none select-none cursor-grab active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {cropSrc && (
                  <img
                    ref={imgRef}
                    src={cropSrc}
                    alt="Prévia do recorte"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`, transformOrigin: 'center' }}
                    draggable={false}
                  />
                )}
                <div className="absolute inset-0 pointer-events-none border-2 border-[#FFD100] rounded-xl" />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 shrink-0">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#FFD100]"
                  aria-label="Zoom da imagem"
                />
                <span className="text-xs text-gray-400 shrink-0">{Math.round(zoom * 100)}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Arraste a imagem para reposicionar. O resultado será cortado em formato 4:3 horizontal.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-300 text-gray-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCrop}
                disabled={busy}
                className="flex-1 min-h-[48px] rounded-xl bg-[#FFD100] text-ink font-bold disabled:opacity-60"
              >
                {busy ? 'Enviando...' : 'Aplicar corte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
