import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiVisionPreview, { visionForPrompt } from './AiVisionPreview';

describe('visionForPrompt', () => {
  it.each([
    ['Design an MVR evaporator for wastewater', 'evaporator'],
    ['Create a CSTR reactor train', 'reactor'],
    ['Plan a distillation column', 'distillation'],
    ['Design a utility plant', 'plant'],
  ])('selects the %s concept', (prompt, expected) => {
    expect(visionForPrompt(prompt)).toBe(expected);
  });
});

describe('AiVisionPreview', () => {
  it('offers a focused preview and hands the brief to EDG AI', () => {
    const onUseProject = jest.fn();
    render(<MemoryRouter><AiVisionPreview prompt="Plan a distillation column" onUseProject={onUseProject} model={{ equipment: [{ tag: 'E-001', name: 'Feed pump' }] }} /></MemoryRouter>);

    expect(screen.getByText('Distillation concept')).toBeInTheDocument();
    expect(screen.getByText('Feed pump')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'equipment' }));
    expect(screen.getByRole('button', { name: 'equipment' })).toHaveClass('is-selected');
    fireEvent.click(screen.getByRole('button', { name: /Build this brief/i }));
    expect(onUseProject).toHaveBeenCalledTimes(1);
  });
});
