import Field from '../models/Field.js';
import Notification from '../models/Notification.js';

const DAY = 864e5;

export async function notify(userId, { type, title, message, dedupeKey }) {
  try {
    return await Notification.create({ user: userId, type, title, message, dedupeKey });
  } catch (e) {
    if (e.code === 11000) return null; // already sent
    throw e;
  }
}

// Returns a reminder if the field's expected harvest is within the next 7 days, otherwise null.
export function buildHarvestReminder(field, now = new Date()) {
  if (!field.expectedHarvestDate) return null;
  const harvest = new Date(field.expectedHarvestDate);
  const days = Math.ceil((harvest - now) / DAY);
  if (Number.isNaN(days) || days < 0 || days > 7) return null;
  const when = days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`;
  return {
    type: 'crop_reminder',
    title: `Harvest reminder: ${field.name}`,
    message: `${field.name} (${field.crop}) is expected to be ready for harvest ${when}.`,
    dedupeKey: `harvest:${field._id}:${harvest.toISOString().slice(0, 10)}`,
  };
}

export async function syncHarvestReminders(userId, now = new Date()) {
  const fields = await Field.find({
    owner: userId,
    expectedHarvestDate: { $gte: new Date(now.getTime() - DAY), $lte: new Date(now.getTime() + 8 * DAY) },
  });
  for (const f of fields) {
    const reminder = buildHarvestReminder(f, now);
    if (reminder) await notify(userId, reminder);
  }
}
