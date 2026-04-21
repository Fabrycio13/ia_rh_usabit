import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface City {
    id: number;
    nome: string;
    microrregiao: { mesorregiao: { UF: { sigla: string } } };
}

interface CityAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    inputStyle: React.CSSProperties;
}

export const CityAutocomplete = ({ value, onChange, inputStyle }: CityAutocompleteProps) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync when external value changes
    useEffect(() => { setQuery(value || ''); }, [value]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const search = async (text: string) => {
        setQuery(text);
        onChange(text);
        if (text.length < 2) { setSuggestions([]); setOpen(false); return; }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                let all: City[] = [];
                const cached = localStorage.getItem('ibge_raw_cities');
                if (cached) {
                    all = JSON.parse(cached);
                } else {
                    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`);
                    all = await res.json();
                    try { localStorage.setItem('ibge_raw_cities', JSON.stringify(all)); } catch { /* ignore quota */ }
                }

                const safeInput = removeAccents(text.toLowerCase());
                const filtered = all.filter(c =>
                    removeAccents(c.nome.toLowerCase()).includes(safeInput)
                ).slice(0, 8);
                
                setSuggestions(filtered);
                setOpen(filtered.length > 0);
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    const select = (city: City) => {
        const formatted = `${city.nome}, ${city.microrregiao.mesorregiao.UF.sigla}`;
        setQuery(formatted);
        onChange(formatted);
        setSuggestions([]);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} style={{ marginTop: '20px', position: 'relative' }}>
            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                Cidade / Estado
            </label>
            <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none'
                }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        if (suggestions.length > 0) setOpen(true);
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'none';
                    }}
                    placeholder="Ex: São Paulo, SP"
                    autoComplete="off"
                    style={{ ...inputStyle, paddingLeft: '40px' }}
                />
                {loading && (
                    <span style={{
                        position: 'absolute', right: 14, top: '50%',
                        transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-dim)'
                    }}>buscando...</span>
                )}
            </div>

            {open && suggestions.length > 0 && (
                <ul style={{
                    position: 'absolute', zIndex: 100, top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', padding: '4px', margin: 0, listStyle: 'none',
                    maxHeight: '240px', overflowY: 'auto'
                }}>
                    {suggestions.map(city => (
                        <li
                            key={city.id}
                            onMouseDown={() => select(city)}
                            style={{
                                padding: '10px 12px', borderRadius: '7px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                transition: 'background 0.15s', fontSize: '13px', color: 'var(--text-main)'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span>{city.nome}</span>
                            <span style={{
                                marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
                                color: 'var(--text-dim)', background: 'var(--bg-main)',
                                padding: '2px 7px', borderRadius: 6
                            }}>{city.microrregiao.mesorregiao.UF.sigla}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
