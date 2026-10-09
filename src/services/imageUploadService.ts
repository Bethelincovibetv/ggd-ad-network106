import defaultAdImg from '@/assets/default-ad.jpg';
import defaultSlideImg from '@/assets/default-slider.jpg';

export interface ImageUploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  fileName?: string;
}

/**
 * Optimizes an image File or Blob client-side before upload using HTML5 Canvas.
 * Resizes large dimensions (e.g. 4000x3000 down to maxWidth/maxHeight) and compresses
 * to crisp, lightweight JPEG/WEBP data URLs (~100KB-250KB instead of 5MB-10MB).
 */
export async function optimizeImageFile(
  file: File | Blob,
  options: ImageUploadOptions = {}
): Promise<string> {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.85,
  } = options;

  // Read SVG or tiny files directly as Data URL
  if ('type' in file && (file.type === 'image/svg+xml' || file.size < 50 * 1024)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: string) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    // Safety timeout: if Image.onload takes too long or fails on special mobile codecs, fallback cleanly
    const timer = setTimeout(() => {
      const reader = new FileReader();
      reader.onload = () => finish((reader.result as string) || '');
      reader.onerror = () => finish('');
      reader.readAsDataURL(file);
    }, 4000);

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      clearTimeout(timer);
      const reader = new FileReader();
      reader.onload = () => finish((reader.result as string) || '');
      reader.onerror = () => finish('');
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();

    img.onload = () => {
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}

      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        const reader = new FileReader();
        reader.onload = () => finish((reader.result as string) || '');
        reader.onerror = () => finish('');
        reader.readAsDataURL(file);
        return;
      }

      // Scale down proportionally if larger than maximum constraints
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => finish((reader.result as string) || '');
        reader.onerror = () => finish('');
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        finish(dataUrl);
      } catch {
        try {
          finish(canvas.toDataURL('image/png'));
        } catch {
          const reader = new FileReader();
          reader.onload = () => finish((reader.result as string) || '');
          reader.onerror = () => finish('');
          reader.readAsDataURL(file);
        }
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      const reader = new FileReader();
      reader.onload = () => finish((reader.result as string) || '');
      reader.onerror = () => finish('');
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image (File, Blob, or base64 Data URL) to the application's backend
 * `/api/upload` endpoint and returns a permanent public URL (e.g. `/uploads/ad-images/...`).
 * 
 * If the server endpoint is temporarily unavailable, it automatically falls back
 * to the optimized compact Data URL so that the user's action is never blocked.
 */
export async function uploadImage(
  input: File | Blob | string,
  options: ImageUploadOptions = {}
): Promise<string> {
  const { folder = 'images' } = options;

  let dataUrl: string;
  let fileName = options.fileName;

  if (typeof input === 'string') {
    // If it's already an uploaded path or remote HTTP URL, return as-is
    if (input.startsWith('/uploads/') || (input.startsWith('http') && !input.startsWith('data:'))) {
      return input;
    }
    dataUrl = input;
  } else {
    fileName = fileName || (input instanceof File ? input.name : 'upload.jpg');
    dataUrl = await optimizeImageFile(input, options);
  }

  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl || '';
  }

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: dataUrl,
        fileName: fileName || `img_${Date.now()}.jpg`,
        folder,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url || data.publicUrl) {
        return data.url || data.publicUrl;
      }
    }
  } catch (err) {
    console.warn('[Image Upload Service] Notice uploading to backend /api/upload, using optimized fallback:', err);
  }

  // Graceful fallback to the optimized data URL so images never break
  return dataUrl;
}

/**
 * Resolves a safe image URL, ensuring broken or null URLs fall back to a branded asset.
 */
export function safeImageUrl(
  url?: string | null,
  fallback: string = defaultAdImg
): string {
  if (!url || typeof url !== 'string') return fallback;
  const clean = url.trim();
  if (
    clean === '' ||
    clean === 'null' ||
    clean === 'undefined' ||
    clean === 'placeholder' ||
    clean.includes('placeholder.svg')
  ) {
    return fallback;
  }
  // Ensure relative upload paths have leading slash
  if (clean.startsWith('uploads/')) {
    return `/${clean}`;
  }
  return clean;
}

/**
 * Creates an onError handler for <img> elements to gracefully swap broken images
 * with a reliable fallback asset instead of showing broken icon boxes.
 */
export function handleImageError(fallback: string = defaultAdImg) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== fallback) {
      target.onerror = null; // Prevent infinite error loops
      target.src = fallback;
    }
  };
}

export { defaultAdImg, defaultSlideImg };
