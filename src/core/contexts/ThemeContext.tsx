import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type BgTheme = 'simple' | 'planets' | 'spatial';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    bgTheme: BgTheme;
    setBgTheme: (theme: BgTheme) => void;
    planetMode: boolean; // Keep for backward compatibility
    togglePlanetMode: () => void;
    customPrimaryColor: string | null;
    setCustomPrimaryColor: (color: string | null) => void;
    customTextColor: string | null;
    setCustomTextColor: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as Theme) || 'dark'; // Default to dark as requested
    });

    const [bgTheme, setBgThemeState] = useState<BgTheme>(() => {
        const saved = localStorage.getItem('app-bg-theme');
        if (saved) return saved as BgTheme;
        
        // Migrate from old planetMode if exists
        const oldPlanet = localStorage.getItem('app-planet-mode');
        if (oldPlanet === 'false') return 'simple';
        return 'spatial'; // New default is Spatial
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
        // Clear old theme classes
        document.body.classList.remove('bg-theme-simple', 'bg-theme-planets', 'bg-theme-spatial');
        // Add current theme class
        document.body.classList.add(`bg-theme-${bgTheme}`);
    }, [bgTheme]);

    // Apply custom colors
    useEffect(() => {
        if (customPrimaryColor) {
            localStorage.setItem('app-custom-primary', customPrimaryColor);
            document.documentElement.style.setProperty('--primary', customPrimaryColor);
            
            // Generate RGB for transparencies
            const r = parseInt(customPrimaryColor.slice(1, 3), 16);
            const g = parseInt(customPrimaryColor.slice(3, 5), 16);
            const b = parseInt(customPrimaryColor.slice(5, 7), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
            }
        } else {
            localStorage.removeItem('app-custom-primary');
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--primary-rgb');
        }
    }, [customPrimaryColor]);

    useEffect(() => {
        if (customTextColor) {
            localStorage.setItem('app-custom-text', customTextColor);
            document.documentElement.style.setProperty('--text-main', customTextColor);
        } else {
            localStorage.removeItem('app-custom-text');
            document.documentElement.style.removeProperty('--text-main');
        }
    }, [customTextColor]);

    const setBgTheme = (newTheme: BgTheme) => {
        setBgThemeState(newTheme);
        if (newTheme === 'planets' || newTheme === 'spatial') {
            if (theme !== 'dark') setTheme('dark');
        }
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        const direction = nextTheme === 'dark' ? 'ltr' : 'rtl';

        // Suporte para View Transitions API
        const doc = document as any;
        
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
