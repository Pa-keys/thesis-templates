import { NetworkBadge } from '../shared/NetworkBadge';
import { Icon } from '../shared/Icon';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';

interface BreadcrumbItem {
    label: string;
    current?: boolean;
}

interface TopbarProps {
    title: string;
    sectionLabel?: string;
    breadcrumbs?: BreadcrumbItem[];
    userName: string;
    userInitials: string;
    userRole: string;
    isOnline: boolean;
    onOpenNavigation: () => void;
    onUserMenuClick?: () => void;
}

export function Topbar({
    title,
    sectionLabel = 'MEDISENS',
    breadcrumbs,
    userName,
    userInitials,
    userRole,
    isOnline,
    onOpenNavigation,
    onUserMenuClick,
}: TopbarProps) {
    return (
        <header className="sticky top-0 z-30 flex h-[52px] w-full shrink-0 items-center justify-between border-b border-[#DDE7EF] bg-white px-3 backdrop-blur md:h-[56px] md:px-5">
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenNavigation}
                    aria-label="Open navigation menu"
                    className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E293B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#334155] md:hidden"
                >
                    <Icon name="menu" className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                    <div className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#5F82A3] sm:block">{sectionLabel}</div>
                    <h1 className="truncate text-base font-semibold leading-tight text-[#0F3154]">{title}</h1>
                    {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
                </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
                <NetworkBadge isOnline={isOnline} compact className="hidden sm:inline-flex lg:hidden" />
                <NetworkBadge isOnline={isOnline} className="hidden lg:inline-flex" />
                <div className="hidden h-6 w-px bg-[#DDE7EF] sm:block" />
                <UserMenu userName={userName} userInitials={userInitials} userRole={userRole} isOnline={isOnline} onLogoutClick={onUserMenuClick} />
            </div>
        </header>
    );
}
