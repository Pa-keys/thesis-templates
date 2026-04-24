import React, { useEffect, useState } from 'react';

/**
 * ThemeToggle — A premium animated sun/moon toggle for light/dark mode.
 * Persists choice in localStorage and respects OS-level preference on first visit.
 * Adds/removes the `dark` class on <html> so Tailwind's dark: variants + our
 * CSS custom-property overrides both activate.
 */
export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('theme');
        if (
            stored === 'dark' ||
            (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <button
            id="theme-toggle-btn"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative w-9 h-9 flex items-center justify-center rounded-full
                       bg-slate-100 dark:bg-neutral-800
                       hover:bg-slate-200 dark:hover:bg-neutral-700
                       border border-slate-200 dark:border-neutral-700
                       transition-all duration-300 shadow-sm print:hidden"
        >
            {/* Sun icon */}
            <svg
                className={`absolute w-[18px] h-[18px] text-amber-500 transition-all duration-300
                    ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {/* Moon icon */}
            <svg
                className={`absolute w-[18px] h-[18px] text-blue-300 transition-all duration-300
                    ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        </button>
    );
}
