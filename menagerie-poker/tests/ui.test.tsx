import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { StoreProvider, initialState, reducer, loadState } from '../src/state/store';

const renderApp = () => render(<StoreProvider init={initialState()}><App /></StoreProvider>);

beforeEach(() => { localStorage.clear(); });

describe('app UI', () => {
  it('renders the hand view with the animal suit legend', () => {
    renderApp();
    expect(screen.getAllByText(/Cat=C/).length).toBeGreaterThan(0);
    expect(screen.getByText('PACK SAYS')).toBeInTheDocument();
  });

  it('picks hole cards from the grid and shows a recommendation', () => {
    renderApp();
    fireEvent.click(screen.getAllByText('Clear')[0]);
    const picker = screen.getByLabelText('Hole card picker');
    fireEvent.click(within(picker).getByLabelText('A of Spades (Snake)'));
    fireEvent.click(within(picker).getByLabelText('A of Diamonds (Dog)'));
    expect(screen.getAllByText('AA').length).toBeGreaterThan(0);
    expect(screen.getByText('raise')).toBeInTheDocument();
  });

  it('shows an honest message for unmodelled spots', () => {
    renderApp();
    fireEvent.click(screen.getAllByRole('radio', { name: 'BB' })[0]);
    expect(screen.getByText(/BB never opens/)).toBeInTheDocument();
  });

  it('renders all 169 matrix cells', () => {
    renderApp();
    fireEvent.click(screen.getAllByText('Matrix')[0]);
    expect(screen.getAllByRole('gridcell')).toHaveLength(169);
  });

  it('answers a quiz question and records the result', () => {
    renderApp();
    fireEvent.click(screen.getAllByText('Practice')[0]);
    const choice = screen.getAllByRole('button').find((b) => /^\d(raise|fold|jam|3bet|call)$/i.test(b.textContent ?? ''))!;
    fireEvent.click(choice);
    expect(screen.getByText(/Correct\.|Pack says/)).toBeInTheDocument();
  });

  it('adds a player and logs a hand', () => {
    renderApp();
    fireEvent.click(screen.getAllByText('Players')[0]);
    fireEvent.change(screen.getByPlaceholderText('Seat / nickname'), { target: { value: 'Test villain' } });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Raise'));
    fireEvent.click(screen.getByText('Save hand'));
    expect(screen.getAllByText(/1 hands/).length).toBeGreaterThan(0);
  });

  it('rejects bad amounts and enforces the loss limit', () => {
    renderApp();
    fireEvent.click(screen.getAllByText('History')[0]);
    const amt = screen.getByLabelText('Amount');
    fireEvent.change(amt, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Log'));
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a number/);
    fireEvent.change(amt, { target: { value: '-20' } });
    fireEvent.click(screen.getByText('Log'));
    expect(screen.getByText(/LIMIT REACHED/)).toBeInTheDocument();
  });
});

describe('store', () => {
  it('recovers from corrupt storage', () => {
    localStorage.setItem('animal-poker/v1', '{not json');
    expect(loadState().version).toBe(1);
  });
  it('reducer adds and removes ideas', () => {
    let s = initialState();
    s = reducer(s, { t: 'idea/add', idea: { id: 'x', text: 't', zeroCost: true, done: false } });
    expect(s.ideas.some((i) => i.id === 'x')).toBe(true);
    s = reducer(s, { t: 'idea/remove', id: 'x' });
    expect(s.ideas.some((i) => i.id === 'x')).toBe(false);
  });
});
