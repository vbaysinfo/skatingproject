import type { FilePayload } from './api';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_TYPES = ['application/pdf', ...IMAGE_TYPES];
const MAX_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

/** Downscales large photos in the browser before upload (keeps Apps Script payloads small). */
async function optimiseImage(file: File, maxSide: number): Promise<Blob> {
  if (!IMAGE_TYPES.includes(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.85));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export async function toFilePayload(file: File, opts: { allowed?: string[]; maxSide?: number } = {}): Promise<FilePayload> {
  const allowed = opts.allowed || DOCUMENT_TYPES;
  if (!allowed.includes(file.type)) throw new Error('Please choose a ' + allowed.map((t) => t.split('/')[1]!.toUpperCase()).join(', ') + ' file.');
  const blob = await optimiseImage(file, opts.maxSide || 2000);
  if (blob.size > MAX_BYTES) throw new Error('The file is too large (max 8 MB).');
  const dataUrl = await readAsDataUrl(blob);
  const mimeType = blob.type || file.type;
  const name = mimeType === 'image/webp' && !/\.webp$/i.test(file.name) ? file.name.replace(/\.[^.]+$/, '') + '.webp' : file.name;
  return { name, mimeType, base64: dataUrl.split(',')[1] || '' };
}
