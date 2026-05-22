/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type BgTheme = 'simple' | 'planets' | 'spatial';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    bgTheme: BgTheme;
    setBgTheme: (theme: BgTheme) => void;
    planetMode: boolean;
    togglePlanetMode: () => void;
    customPrimaryColor: string | null;
    setCustomPrimaryColor: (color: string | null) => void;
    customTextColor: string | null;
    setCustomTextColor: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const h = hex.replace('#', '');
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
}

function hexWithAlpha(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
    return `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)}${a.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
    const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
    const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function lighten(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function applyPrimary(hex: string | null) {
    if (hex) {
        localStorage.setItem('app-custom-primary', hex);
        document.documentElement.style.setProperty('--primary', hex);
        document.documentElement.style.setProperty('--sidebar-active', hexWithAlpha(hex, 0.1));
        document.documentElement.style.setProperty('--sidebar-active-text', hex);
        const rgb = hexToRgb(hex);
        if (rgb) {
            document.documentElement.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            document.documentElement.style.setProperty('--primary-hover', darken(hex, 0.15));
            document.documentElement.style.setProperty('--primary-light-bg', hexWithAlpha(hex, 0.1));
            document.documentElement.style.setProperty('--primary-border', hexWithAlpha(hex, 0.3));
            document.documentElement.style.setProperty('--primary-text-light', lighten(hex, 0.65));
        }
    } else {
        localStorage.removeItem('app-custom-primary');
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--primary-rgb');
        document.documentElement.style.removeProperty('--primary-hover');
        document.documentElement.style.removeProperty('--primary-light-bg');
        document.documentElement.style.removeProperty('--primary-border');
        document.documentElement.style.removeProperty('--primary-text-light');
        document.documentElement.style.removeProperty('--sidebar-active');
        document.documentElement.style.removeProperty('--sidebar-active-text');
    }
}

function applyText(hex: string | null) {
    if (hex) {
        localStorage.setItem('app-custom-text', hex);
        document.documentElement.style.setProperty('--text-main', hex);
        document.documentElement.style.setProperty('--text-muted', hexWithAlpha(hex, 0.65));
        document.documentElement.style.setProperty('--text-dim', hexWithAlpha(hex, 0.45));
    } else {
        localStorage.removeItem('app-custom-text');
        document.documentElement.style.removeProperty('--text-main');
        document.documentElement.style.removeProperty('--text-muted');
        document.documentElement.style.removeProperty('--text-dim');
    }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as Theme) || 'dark';
    });

    const [bgTheme, setBgThemeState] = useState<BgTheme>(() => {
        const saved = localStorage.getItem('app-bg-theme');
        if (saved) return saved as BgTheme;
        const oldPlanet = localStorage.getItem('app-planet-mode');
        if (oldPlanet === 'false') return 'simple';
        return 'spatial';
    });

    const planetMode = bgTheme === 'planets';

    const [customPrimaryColor, setCustomPrimaryColor] = useState<string | null>(() => {
        return localStorage.getItem('app-custom-primary') || null;
    });

    const [customTextColor, setCustomTextColor] = useState<string | null>(() => {
        return localStorage.getItem('app-custom-text') || null;
    });

    useEffect(() => {
        localStorage.setItem('app-theme', theme);
        document.documentElement.className = theme;
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('app-bg-theme', bgTheme);
        document.body.classList.remove('bg-theme-simple', 'bg-theme-planets', 'bg-theme-spatial');
        document.body.classList.add(`bg-theme-${bgTheme}`);
    }, [bgTheme]);

    useEffect(() => { applyPrimary(customPrimaryColor); }, [customPrimaryColor]);
    useEffect(() => { applyText(customTextColor); }, [customTextColor]);

    const setBgTheme = (newTheme: BgTheme) => {
        setBgThemeState(newTheme);
        if (newTheme === 'planets' || newTheme === 'spatial') {
            if (theme !== 'dark') setTheme('dark');
        }
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        const direction = nextTheme === 'dark' ? 'ltr' : 'rtl';

        const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
        
        const executeToggle = () => {
            setTheme(nextTheme);
            if (nextTheme === 'light' && bgTheme !== 'simple') {
                setBgThemeState('simple');
            }
        };

        if (!doc.startViewTransition) {
            executeToggle();
            return;
        }

        document.documentElement.setAttribute('data-theme-anim', direction);

        doc.startViewTransition(() => {
            executeToggle();
        });
    };

    const togglePlanetMode = () => {
        setBgTheme(bgTheme === 'planets' ? 'simple' : 'planets');
    };

    return (
        <ThemeContext.Provider value={{ 
            theme, 
            toggleTheme, 
            bgTheme,
            setBgTheme,
            planetMode, 
            togglePlanetMode: () => togglePlanetMode(),
            customPrimaryColor,
            setCustomPrimaryColor,
            customTextColor,
            setCustomTextColor
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
