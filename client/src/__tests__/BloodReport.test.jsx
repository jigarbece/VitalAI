import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BloodReport, { scoreColor } from '../components/BloodReport.jsx';

describe('scoreColor', () => {
  it('returns Excellent for 80+', () => {
    expect(scoreColor(85).label).toBe('Excellent');
    expect(scoreColor(100).label).toBe('Excellent');
  });
  it('returns Good for 60-79', () => {
    expect(scoreColor(70).label).toBe('Good');
  });
  it('returns Fair for 40-59', () => {
    expect(scoreColor(45).label).toBe('Fair');
  });
  it('returns Needs Attention for under 40', () => {
    expect(scoreColor(20).label).toBe('Needs Attention');
    expect(scoreColor(0).label).toBe('Needs Attention');
  });
});

describe('<BloodReport />', () => {
  const data = {
    healthScore: 72,
    bloodMarkers: [
      { name: 'Hemoglobin', value: '13.5 g/dL', normalRange: '13-17 g/dL', status: 'normal', note: 'within range' },
      { name: 'Vitamin D', value: '20 ng/mL', normalRange: '30-100 ng/mL', status: 'low', note: 'low' },
    ],
    keyFindings: ['Vitamin D is low.', 'Hemoglobin is OK.'],
  };

  it('renders the score and label', () => {
    render(<BloodReport data={data} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /good/i })).toBeInTheDocument();
  });

  it('renders all markers in the table', () => {
    render(<BloodReport data={data} />);
    expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
    expect(screen.getByText('Vitamin D')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders each key finding', () => {
    render(<BloodReport data={data} />);
    expect(screen.getByText('Vitamin D is low.')).toBeInTheDocument();
    expect(screen.getByText('Hemoglobin is OK.')).toBeInTheDocument();
  });

  it('shows medical disclaimer', () => {
    render(<BloodReport data={data} />);
    expect(screen.getByText(/medical disclaimer/i)).toBeInTheDocument();
  });

  it('handles missing markers gracefully', () => {
    render(<BloodReport data={{ healthScore: 50, bloodMarkers: [], keyFindings: [] }} />);
    expect(screen.getByText(/no biomarkers detected/i)).toBeInTheDocument();
  });
});
