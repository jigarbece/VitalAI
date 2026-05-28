import express from 'express';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body';
  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const message = (body.message || '').toString().trim();
  if (!name) return 'Name is required';
  if (name.length > 200) return 'Name is too long';
  if (!email) return 'Email is required';
  if (!EMAIL_RE.test(email)) return 'A valid email is required';
  if (!message) return 'Message is required';
  if (message.length < 5) return 'Message is too short';
  if (message.length > 4000) return 'Message is too long (max 4000 chars)';
  return null;
}

export function createContactRouter({ mailService }) {
  const router = express.Router();

  router.post('/api/contact', async (req, res) => {
    const err = validate(req.body);
    if (err) return res.status(400).json({ error: err });

    const payload = {
      name: req.body.name.toString().trim(),
      email: req.body.email.toString().trim(),
      message: req.body.message.toString().trim(),
    };

    try {
      const result = await mailService.sendContact(payload);
      if (!result.logged && !result.delivered) {
        return res.status(500).json({
          error: 'We could not save your message. Please try again later.',
        });
      }
      return res.json({
        ok: true,
        delivered: result.delivered,
        message: result.delivered
          ? 'Thanks - your message is on its way.'
          : 'Thanks - we have stored your message and will respond soon.',
      });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to send message' });
    }
  });

  return router;
}
