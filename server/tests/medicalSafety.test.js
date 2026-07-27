import { describe, expect, it } from 'vitest';
import { detectUrgentConcern } from '../services/medicalSafety.js';

describe('medical safety', () => {
  it('detects urgent text', () => {
    expect(detectUrgentConcern({ conditions: 'New chest pain today' })).toBe(true);
  });

  it('allows ordinary wellness text', () => {
    expect(detectUrgentConcern({ conditions: 'Mild hypertension' })).toBe(false);
  });
});
