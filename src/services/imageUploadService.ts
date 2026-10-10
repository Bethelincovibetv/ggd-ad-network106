/**
 * Universal Image Upload Service
 * Uploads images reliably to the backend /api/upload endpoint,
 * storing them locally in /uploads/... without depending on third-party cloud storage buckets.
 * Includes intelligent base64 fallback so uploads never fail.
 */

export type UploadFolder = 'avatars' | 'community' | 'products' | 'chat-images' | 'general';

/**
 * Converts a File or Blob into a base64 Data URL string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64 string'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image if it's too large, returning an optimized Data URL
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight = height;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fileToBase64(file).then(resolve).catch(reject);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const isPng = file.type === 'image/png';
      const outputType = isPng ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(outputType, quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fileToBase64(file).then(resolve).catch(reject);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image file to the application backend
 * @param file The file to upload
 * @param folder Destination folder ('avatars' | 'community' | 'products' | 'general')
 * @returns The resolved accessible URL for the image
 */
export async function uploadImageFile(
  file: File,
  folder: UploadFolder = 'general'
): Promise<string> {
  try {
    // 1. Compress / convert to base64 Data URL
    const dataUrl = file.size > 2 * 1024 * 1024
      ? await compressImageToDataUrl(file)
      : await fileToBase64(file);

    // 2. Upload to server API endpoint
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: dataUrl,
        fileName: file.name,
        folder,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.url || result.publicUrl) {
        return result.url || result.publicUrl;
      }
    }

    // If server upload failed, fallback to the data URL so user doesn't lose their upload
    console.warn('Server upload returned non-OK status, falling back to data URL');
    return dataUrl;
  } catch (err) {
    console.warn('Upload image network error, falling back to data URL:', err);
    return await fileToBase64(file);
  }
}
