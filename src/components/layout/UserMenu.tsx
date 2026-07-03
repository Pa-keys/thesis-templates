import { Icon } from '../shared/Icon';

interface UserMenuProps {
    userName: string;
    userInitials: string;
    userRole: string;
    isOnline?: boolean;
    onLogoutClick?: () => void;
}

export function UserMenu({ userName, userInitials, userRole, isOnline = true, onLogoutClick }: UserMenuProps) {
    const avatarColor = isOnline ? 'bg-[#42AEE8]' : 'bg-amber-500';
    const content = (
        <>
            <div className="hidden min-w-0 text-right sm:block">
                <div className="truncate text-sm font-bold leading-tight text-[#0F3154]">{userName}</div>
                <div className="truncate text-[0.7rem] font-semibold text-[#334155]">{userRole}</div>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white shadow-sm ${avatarColor}`}>
                {userInitials}
            </div>
            {onLogoutClick && <Icon name="logout" className="hidden h-4 w-4 text-slate-400 transition-colors group-hover:text-red-600 sm:block" />}
        </>
    );

    if (!onLogoutClick) {
        return <div className="flex min-w-0 items-center gap-3">{content}</div>;
    }

    return (
        <button
            type="button"
            onClick={onLogoutClick}
            className="group flex min-w-0 items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#42AEE8]"
            title="Open user menu"
        >
            {content}
        </button>
    );
}
