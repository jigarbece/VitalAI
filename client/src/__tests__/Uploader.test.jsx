import React from 'react';
import { describe, it, expect } from 'vitest';
import { validateFile, MAX_BYTES } from '../components/Uploader.jsx';

function fakeFile({ name, size, type }) {
  const f = new File(['x'.repeat(Math.min(size, 1024))], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('validateFile', () => {
  it('accepts a small PDF', () => {
    expect(validateFile(fakeFile({ name: 'r.pdf', size: 1024, type: 'application/pdf' }))).toBeNull();
  });

  it('accepts a JPG image', () => {
    expect(validateFile(fakeFile({ name: 'r.jpg', size: 2048, type: 'image/jpeg' }))).toBeNull();
  });

  it('accepts a PNG image', () => {
    expect(validateFile(fakeFile({ name: 'r.png', size: 2048, type: 'image/png' }))).toBeNull();
  });

  it('rejects unsupported types', () => {
    expect(validateFile(fakeFile({ name: 'r.docx', size: 1024, type: 'application/msword' }))).toMatch(/unsupported/i);
  });

  it('rejects files over 10MB', () => {
    expect(validateFile(fakeFile({ name: 'big.pdf', size: MAX_BYTES + 1, type: 'application/pdf' }))).toMatch(/10MB/);
  });

  it('rejects null', () => {
    expect(validateFile(null)).toMatch(/choose/i);
  });

  it('accepts files where mimetype is empty but extension is valid', () => {
    expect(validateFile(fakeFile({ name: 'scan.PDF', size: 1024, type: '' }))).toBeNull();
  });
});
