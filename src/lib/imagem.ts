/**
 * Reduz fotos grandes (ex.: câmera do celular, 4–12 MB) antes do envio:
 * lado maior até 1920 px, JPEG 82%. Mantém o arquivo original se não for imagem,
 * se já for pequeno ou se o navegador não conseguir decodificar (ex.: HEIC no desktop).
 */
const LADO_MAX = 1920;
const LIMITE_SEM_COMPRIMIR = 1.2 * 1024 * 1024;

async function carregar(file: File): Promise<{ w: number; h: number; desenhar: (c: CanvasRenderingContext2D, w: number, h: number) => void; liberar: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { w: bmp.width, h: bmp.height, desenhar: (c, w, h) => c.drawImage(bmp, 0, 0, w, h), liberar: () => bmp.close() };
    } catch {
      /* cai para <img> */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((ok, erro) => {
    img.onload = () => ok();
    img.onerror = () => erro(new Error('imagem inválida'));
    img.src = url;
  });
  return { w: img.naturalWidth, h: img.naturalHeight, desenhar: (c, w, h) => c.drawImage(img, 0, 0, w, h), liberar: () => URL.revokeObjectURL(url) };
}

export async function comprimirImagem(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) return file;
  try {
    const im = await carregar(file);
    const escala = Math.min(1, LADO_MAX / Math.max(im.w, im.h));
    if (escala === 1 && file.size <= LIMITE_SEM_COMPRIMIR) {
      im.liberar();
      return file;
    }
    const w = Math.round(im.w * escala), h = Math.round(im.h * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    im.desenhar(ctx, w, h);
    im.liberar();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const nome = file.name.replace(/\.(png|webp|heic|heif|jpe?g)$/i, '') + '.jpg';
    return new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Nome amigável para foto tirada pela câmera (vem como "image.jpg"). */
export function nomeFotoCamera(file: File, n: number): File {
  if (!/^image\.(jpe?g|png|heic)$/i.test(file.name)) return file;
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  const nome = `foto-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${n}.${file.name.split('.').pop()}`;
  return new File([file], nome, { type: file.type, lastModified: file.lastModified });
}
