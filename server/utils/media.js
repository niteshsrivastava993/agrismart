import Media from '../models/Media.js';

const startsWith = (buf, bytes, offset = 0) => buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

// Identifies an image by its first bytes, ignoring whatever the client claims.
export function sniffImage(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

export const mediaOwned = async (id, owner) => !id || Boolean(await Media.exists({ _id: id, owner }));
export const dropMedia = (id, owner) => (id ? Media.deleteOne({ _id: id, owner }).catch((e) => console.error('media cleanup failed:', e.message)) : null);
