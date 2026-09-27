// Shrinks a photo to at most maxDim pixels and re-encodes it as JPEG.
// Re-encoding also drops camera metadata such as GPS location.
export async function resizeToJpeg(file, maxDim = 1280, quality = 0.8) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Image is too large (max 15 MB).');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('This image could not be read.'); }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not process the image.');
  if (blob.size > 2 * 1024 * 1024) throw new Error('Image is still over 2 MB after resizing. Try a smaller photo.');
  return blob;
}
