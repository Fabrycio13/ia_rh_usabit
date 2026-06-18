import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    compact?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'dd/mm/aaaa', compact }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const today = new Date();

    // Parse initial date or default to today
    const initialDate = value ? new Date(value + 'T12:00:00') : today;
    const [viewDate, setViewDate] = useState(initialDate);
    
    const calYear = viewDate.getFullYear();
    const calMonth = viewDate.getMonth();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(calYear, calMonth - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(calYear, calMonth + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const date = new Date(calYear, calMonth, day);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    const fmtDisplayDate = (d: string) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
    };

    return (
        <div className="relative inline-block" ref={containerRef} style={{ position: 'relative' }}>
            {/* Trigger */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: compact ? '6px 8px' : '8px 12px',
                    color: value ? 'var(--text-main)' : 'var(--text-dim)',
                    fontSize: compact ? '12px' : '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: compact ? '4px' : '12px',
                    minWidth: compact ? '88px' : '130px',
                    height: compact ? '32px' : '38px',
                    transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => { if(!isOpen) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
                <span>{value ? fmtDisplayDate(value) : placeholder}</span>
                <CalendarIcon size={compact ? 12 : 14} style={{ opacity: 0.6 }} />
            </div>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    width: compact ? '300px' : '300px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(16px)',
                }}>
                    {/* Calendar Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>
                            {monthNames[calMonth]} {calYear}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="cal-nav" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                            <button className="cal-nav" onClick={handleNextMonth}><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    {/* Day Names */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                        {dayNames.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>{d}</div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = ds === value;
                            const isToday = ds === today.toISOString().slice(0, 10);
                            
                            let cls = 'cal-day';
                            if (isSelected) cls += ' cal-active';
                            else if (isToday) cls += ' cal-today';

                            return (
                                <div 
                                    key={day} 
                                    className={cls} 
                                    onClick={() => handleDayClick(day)}
                                    style={{ width: '34px', height: '34px' }}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
