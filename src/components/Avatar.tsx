import { cn, iniciais } from '@/lib/utils';

/** Avatar animado (vidro vermelho Unigás); mostra a foto de perfil quando houver. */
export function Avatar({ nome, foto, className, simples }: { nome: string; foto?: string; className?: string; simples?: boolean }) {
  return (
    <span className={cn(simples ? 'relative overflow-hidden rounded-full bg-elevated' : 'vg-avatar', 'grid shrink-0 place-items-center font-semibold', className)}>
      {foto ? (
        <img src={foto} alt="" className="absolute inset-0 h-full w-full rounded-full object-cover" draggable={false} />
      ) : (
        <span className="relative">{iniciais(nome)}</span>
      )}
    </span>
  );
}

/**
 * Prepara a foto de perfil: recorta o centro em quadrado e reduz para caber
 * numa célula da planilha (data URL JPEG, < 48 mil caracteres).
 */
export async function prepararFotoPerfil(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
  let fonte: ImageBitmap | HTMLImageElement;
  let w: number, h: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    fonte = bmp;
    w = bmp.width;
    h = bmp.height;
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((ok, erro) => {
      img.onload = () => ok();
      img.onerror = () => erro(new Error('Não foi possível ler esta imagem. Tente outra foto (JPG ou PNG).'));
      img.src = url;
    });
    fonte = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const lado = Math.min(w, h);
  const sx = (w - lado) / 2, sy = (h - lado) / 2;
  for (const [tam, q] of [[256, 0.85], [200, 0.8], [160, 0.72], [128, 0.65]] as const) {
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tam, tam);
    ctx.drawImage(fonte, sx, sy, lado, lado, 0, 0, tam, tam);
    const url = c.toDataURL('image/jpeg', q);
    if (url.length < 47000) {
      if ('close' in fonte) fonte.close();
      return url;
    }
  }
  throw new Error('A imagem ficou grande demais. Tente outra foto.');
}
