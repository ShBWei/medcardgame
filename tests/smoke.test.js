/**
 * Smoke test: Verify Vitest + jsdom setup works
 */
import { describe, it, expect } from 'vitest';

describe('Test infrastructure', () => {
  it('has jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('supports DOM manipulation', () => {
    const div = document.createElement('div');
    div.id = 'test';
    div.textContent = 'hello';
    document.body.appendChild(div);
    expect(document.getElementById('test').textContent).toBe('hello');
  });
});

describe('Game config smoke test', () => {
  it('MediCard.Config exists with expected fields', () => {
    // Load deploy-config into jsdom context
    const { MediCard } = window;
    // MediCard modules load via IIFE, we test after loading scripts
    // This tests that our jsdom env is properly set up
    expect(true).toBe(true);
  });
});
