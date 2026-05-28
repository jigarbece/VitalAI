import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserForm, { validateUserProfile } from '../components/UserForm.jsx';

describe('validateUserProfile', () => {
  const base = {
    age: '32',
    gender: 'Male',
    weight: '72',
    height: '175',
    diet: 'Vegetarian',
    activity: 'Moderately Active (3-5 days/week)',
    goals: [],
    conditions: '',
  };

  it('returns no errors for a complete valid profile', () => {
    expect(validateUserProfile(base)).toEqual({});
  });

  it('rejects empty required fields', () => {
    const errs = validateUserProfile({ ...base, age: '', gender: '', weight: '', height: '', diet: '', activity: '' });
    expect(errs.age).toBeDefined();
    expect(errs.gender).toBeDefined();
    expect(errs.weight).toBeDefined();
    expect(errs.height).toBeDefined();
    expect(errs.diet).toBeDefined();
    expect(errs.activity).toBeDefined();
  });

  it('rejects out-of-range age', () => {
    expect(validateUserProfile({ ...base, age: '2' }).age).toBeDefined();
    expect(validateUserProfile({ ...base, age: '150' }).age).toBeDefined();
  });

  it('rejects out-of-range weight and height', () => {
    expect(validateUserProfile({ ...base, weight: '10' }).weight).toBeDefined();
    expect(validateUserProfile({ ...base, height: '40' }).height).toBeDefined();
  });
});

describe('<UserForm />', () => {
  it('shows inline errors when submitting empty', async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /analyze now/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/required|select|pick/i).length).toBeGreaterThan(0);
  });

  it('submits when all fields are filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} onBack={() => {}} />);

    await user.type(screen.getByLabelText(/^age$/i), '30');
    await user.click(screen.getByLabelText('Female'));
    await user.type(screen.getByLabelText(/weight \(kg\)/i), '60');
    await user.type(screen.getByLabelText(/height \(cm\)/i), '165');
    await user.click(screen.getByLabelText(/^Vegetarian$/));
    await user.selectOptions(screen.getByLabelText(/activity level/i), 'Moderately Active (3-5 days/week)');

    await user.click(screen.getByRole('button', { name: /analyze now/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.age).toBe('30');
    expect(submitted.gender).toBe('Female');
    expect(submitted.diet).toBe('Vegetarian');
  });

  it('toggles multi-select goals', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} onBack={() => {}} />);

    const lose = screen.getByLabelText('Lose Weight');
    const energy = screen.getByLabelText('Improve Energy');
    await user.click(lose);
    await user.click(energy);
    expect(lose.checked).toBe(true);
    expect(energy.checked).toBe(true);
    await user.click(lose);
    expect(lose.checked).toBe(false);
  });
});
