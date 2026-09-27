import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { runAssistant } from '../services/assistantService.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.use(protect, rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) })).min(1).max(12),
}).refine((d) => d.messages[d.messages.length - 1].role === 'user', { path: ['messages'], message: 'Last message must be from the user' });

router.get('/status', (req, res) => res.json({ enabled: Boolean(process.env.AI_API_KEY) }));

router.post('/chat', validate(chatSchema), asyncHandler(async (req, res) => {
  const result = await runAssistant({ messages: req.body.messages, user: req.user });
  audit(req.user._id, 'assistant.chat');
  res.json(result);
}));

export default router;
