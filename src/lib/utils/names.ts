export function getInitials(name: string, fallback = '?'): string {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return initials || fallback;
}
