import { useState } from 'react';
import { cryptoId } from '../poker/profile';
import { useStore } from '../state/store';

/** Small floating idea queue. Zero-cost ideas are flagged for implementation. */
export function IdeaQueue() {
  const { s, d } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const pending = s.ideas.filter((i) => !i.done).length;
  return (
    <div className="fixed right-3 bottom-[4.5rem] z-40 md:bottom-4">
      {open && (
        <div className="fade-up mb-2 w-72 rounded-md border border-line bg-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="font-mono text-[10px] tracking-[0.14em] text-dim">IDEA QUEUE</span>
            <button className="text-faint hover:text-fg" onClick={() => setOpen(false)} aria-label="Close idea queue">×</button>
          </div>
          <ul className="grid max-h-56 gap-1 overflow-auto p-2">
            {s.ideas.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-[11px]">
                <input type="checkbox" checked={i.done} onChange={() => d({ t: 'idea/update', id: i.id, patch: { done: !i.done } })} aria-label="Done" className="mt-0.5 accent-[#86ab9d]" />
                <span className={`flex-1 ${i.done ? 'text-faint line-through' : ''}`}>{i.text}</span>
                <button onClick={() => d({ t: 'idea/update', id: i.id, patch: { zeroCost: !i.zeroCost } })}
                  className={`rounded-sm border px-1 font-mono text-[9px] ${i.zeroCost ? 'border-acc/50 text-acc' : 'border-line text-faint'}`} title="Toggle zero-cost">
                  {i.zeroCost ? '$0' : '$'}
                </button>
                <button onClick={() => d({ t: 'idea/remove', id: i.id })} className="text-faint hover:text-bad" aria-label="Remove idea">×</button>
              </li>
            ))}
          </ul>
          <form className="flex gap-1 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; d({ t: 'idea/add', idea: { id: cryptoId(), text: text.trim().slice(0, 140), zeroCost: true, done: false } }); setText(''); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="New idea…" className="min-w-0 flex-1 rounded border border-line bg-panel2 px-2 py-1 text-[11px] placeholder:text-faint" />
            <button className="rounded border border-acc/50 px-2 font-mono text-[10px] text-acc">Add</button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="ml-auto flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[10px] text-dim shadow-lg hover:text-fg" aria-expanded={open}>
        ✦ ideas <span className="text-acc">{pending}</span>
      </button>
    </div>
  );
}
