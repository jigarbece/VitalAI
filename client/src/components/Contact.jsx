import React, { useState } from 'react';
import { useToast } from '../toast.jsx';

const API_URL = import.meta.env?.VITE_API_URL ?? '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, message }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Please tell us your name';
  if (!email || !email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email';
  if (!message || message.trim().length < 5) errors.message = 'Message must be at least 5 characters';
  if (message && message.length > 4000) errors.message = 'Message is too long (max 4000)';
  return errors;
}

export default function Contact({ onBack }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { show } = useToast();

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not send message');
      }
      setSent(true);
      show('Message sent. Thanks for the feedback!', 'success');
    } catch (err) {
      show(err.message || 'Could not send. Please try again.', 'error', 6000);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section className="animate-fade-in max-w-xl mx-auto text-center pt-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mb-5 text-3xl">✓</div>
        <h2 className="text-3xl font-bold">Thanks for reaching out</h2>
        <p className="text-white/60 mt-3">
          We received your message and will reply to <span className="text-white">{form.email}</span> soon.
        </p>
        <button onClick={onBack} className="btn-primary mt-8">Back to home</button>
      </section>
    );
  }

  return (
    <section className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Contact &amp; feedback</h2>
        <p className="text-white/60 mt-2">
          Found a bug, have a feature request, or want to say hi? Drop us a line.
        </p>
        <p className="text-xs text-white/40 mt-1">
          Mail will be sent to <span className="text-teal">curiolightforyou@gmail.com</span>.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 sm:p-8 space-y-5" noValidate>
        <div>
          <label htmlFor="c-name" className="label">Your name</label>
          <input
            id="c-name" type="text" maxLength="200"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="input" placeholder="Jane Doe"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-red-300 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="c-email" className="label">Email</label>
          <input
            id="c-email" type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="input" placeholder="you@example.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="c-msg" className="label">Message</label>
          <textarea
            id="c-msg" rows="6" maxLength="4000"
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            className="input resize-none"
            placeholder="What's on your mind?"
            aria-invalid={!!errors.message}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-red-300">{errors.message || ''}</span>
            <span className="text-white/40">{form.message.length} / 4000</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2 border-t border-white/5">
          <button type="button" onClick={onBack} className="btn-ghost w-full sm:w-auto">← Back</button>
          <button type="submit" disabled={sending} className="btn-primary w-full sm:w-auto">
            {sending ? 'Sending…' : 'Send message'}
            {!sending && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export { validate as validateContactForm };
