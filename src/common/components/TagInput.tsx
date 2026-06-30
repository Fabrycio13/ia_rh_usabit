import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

const TAG_COLORS = [
  { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  { bg: 'rgba(168,85,247,0.15)', color: '#a78bfa', border: 'rgba(168,85,247,0.3)' },
  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
  { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  { bg: 'rgba(20,184,166,0.15)', color: '#5eead4', border: 'rgba(20,184,166,0.3)' },
  { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
];

export const TagInput = ({ value, onChange, suggestions = [], placeholder = 'Adicionar tag...', disabled = false }: TagInputProps) => {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  ).slice(0, 8);

  const addTag = useCallback((tag: string) => {
    const t = tag.toLowerCase().trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setInput('');
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag));
  }, [value, onChange]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input) addTag(input);
      return;
    }
    if (e.key === 'Escape') setOpen(false);
  }, [input, addTag]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Tags em cima — badges coloridos */}
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {value.map((tag, idx) => {
            const c = TAG_COLORS[idx % TAG_COLORS.length];
            return (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              }}>
                {tag}
                {!disabled && (
                  <button type="button" onClick={() => removeTag(tag)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', lineHeight: 0, opacity: 0.6, fontSize: 13 }}>
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Input embaixo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        borderRadius: 8, minHeight: 34,
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.5 : 1,
      }} onClick={() => !disabled && ref.current?.querySelector('input')?.focus()}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            flex: 1, minWidth: 80, border: 'none', background: 'transparent',
            color: 'var(--text-main)', fontSize: 13, outline: 'none',
            fontFamily: 'Inter, sans-serif', padding: '2px 0',
          }}
        />
        {suggestions.length > 0 && (
          <button type="button" onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px', display: 'flex', lineHeight: 0 }}>
            <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {/* Dropdown sugestões */}
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 4, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}>
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); addTag(s); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', fontSize: 13, color: 'var(--text-main)',
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
