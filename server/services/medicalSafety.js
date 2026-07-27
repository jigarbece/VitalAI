const URGENT_PATTERNS = [
  /\bchest pain\b/i,
  /\b(severe|cannot|can't)\s+(breathe|breathing)\b/i,
  /\bfaint(ed|ing)?\b/i,
  /\b(face droop|slurred speech|one-sided weakness)\b/i,
  /\bsevere allergic reaction\b/i,
  /\bself[- ]?harm\b/i,
  /\bsuicid(e|al)\b/i,
];

export function detectUrgentConcern(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  return URGENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function urgentResponse() {
  return {
    error: 'Your information may describe an urgent health concern. Seek immediate local emergency care now. Do not wait for a diet plan.',
    urgent: true,
  };
}
