import type React from 'react';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '11px 14px 11px 42px',
  color: 'var(--text-main)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, background 0.2s',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-muted)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

export const maskCep = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v.substring(0, 9);
};

export const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const maskPhone = (val: string, country: { code: string; iso: string }) => {
    const clean = val.startsWith('+') ? '+' + val.replace(/\D/g, '') : '+' + val.replace(/\D/g, '');
    const digits = clean.replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    let localDigits = digits.startsWith(codeDigits) ? digits.substring(codeDigits.length) : digits;
    localDigits = localDigits.substring(0, 12);
    if (country.code === '+55') {
        let res = '+55 ';
        if (localDigits.length > 0) {
            res += '(' + localDigits.substring(0, 2);
            if (localDigits.length > 2) {
                res += ') ' + localDigits.substring(2, 7);
                if (localDigits.length > 7) res += '-' + localDigits.substring(7, 11);
            }
        }
        return res.trim();
    }
    if (country.code === '+1') {
        let res = '+1 ';
        if (localDigits.length > 0) {
            res += '(' + localDigits.substring(0, 3);
            if (localDigits.length > 3) {
                res += ') ' + localDigits.substring(3, 6);
                if (localDigits.length > 6) res += '-' + localDigits.substring(6, 10);
            }
        }
        return res.trim();
    }
    let res = country.code + ' ';
    for (let i = 0; i < localDigits.length; i++) {
        if (i > 0 && i % 3 === 0 && i < 9) res += ' ';
        res += localDigits[i];
    }
    return res.trim();
};
