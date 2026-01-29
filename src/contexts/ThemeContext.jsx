import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Force dark theme always - no toggle option
    const [theme] = useState('dark');

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old class and add new
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        // Store preference
        localStorage.setItem('theme', theme);
    }, [theme]);

    const value = {
        theme,
        isDark: true // Always true since theme is fixed to dark
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;
