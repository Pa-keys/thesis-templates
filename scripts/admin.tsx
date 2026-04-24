import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';
import { Sidebar } from './sidebar';
import { useToast } from './components/Toast';
import { ThemeToggle } from './components/ThemeToggle';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    email?: string;
    status?: string; // e.g. 'active'
}

const ROLES = ['doctor', 'nurse', 'BHW', 'midwives', 'pharmacist', 'laboratory', 'admin'] as const;

// ─── Utility Components ───────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: string }) => {
    const roleColors: Record<string, string> = {
        doctor: 'bg-blue-50 text-blue-600',
        nurse: 'bg-green-50 text-green-600',
        BHW: 'bg-orange-50 text-orange-600',
        midwives: 'bg-pink-50 text-pink-700',
        pharmacist: 'bg-emerald-50 text-emerald-700',
        laboratory: 'bg-indigo-50 text-indigo-700',
        admin: 'bg-slate-100 text-slate-700'
    };

    const roleLabels: Record<string, string> = {
        doctor: 'Doctor',
        nurse: 'Nurse',
        BHW: 'BHW',
        midwives: 'Midwives',
        pharmacist: 'Pharmacist',
        laboratory: 'Laboratory',
        admin: 'Admin'
    };

    const normalizedRole = role === 'labaratory' ? 'laboratory' : role;
    const colorClass = roleColors[normalizedRole] || roleColors['admin'];
    const label = roleLabels[normalizedRole] || role;

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${colorClass}`}>
            {label}
        </span>
    );
};

const getAvatarColor = (role: string): string => {
    const normalizedRole = role === 'labaratory' ? 'laboratory' : role;
    const map: Record<string, string> = {
        doctor: 'bg-blue-600',
        nurse: 'bg-green-600',
        BHW: 'bg-orange-600',
        midwives: 'bg-pink-700',
        pharmacist: 'bg-emerald-700',
        laboratory: 'bg-indigo-600',
        admin: 'bg-slate-700'
    };
    return map[normalizedRole] || 'bg-slate-700';
};

// ─── Main Application Component ───────────────────────────────────────────────
const AdminDashboard = () => {
    const { showToast, ToastComponent } = useToast();

    // Context & Auth
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activePage, setActivePage] = useState('admin');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [userName, setUserName] = useState('Loading...');
    const [userInitials, setUserInitials] = useState('A');

    // Data State
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');

    // Modal States
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [fFullName, setFFullName] = useState('');
    const [fEmail, setFEmail] = useState('');
    const [fPassword, setFPassword] = useState('');
    const [fRole, setFRole] = useState('');

    // Confirm Delete Modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);

    const navItems = [
        { id: 'admin', label: 'User Management', icon: '👥' },
    ];

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const init = async () => {
            try {
                // Ensure auth and role validation
                const profile = await requireRole('admin');
                setUserName(profile.fullName);
                setUserInitials(profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2));

                await loadUsers();
            } catch (err) {
                console.error("Initialization Failed:", err);
            }
        };

        if (activePage === 'admin') {
            init();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [activePage]);

    const loadUsers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, email')
            .order('role', { ascending: true });

        if (error) {
            showToast('Error loading users: ' + error.message, true);
        } else {
            console.log(data);
            setAllUsers((data as UserProfile[]) || []);
        }
        setIsLoading(false);
    };

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchSearch = `${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
            const matchRole = roleFilter ? u.role === roleFilter : true;
            return matchSearch && matchRole;
        });
    }, [allUsers, searchQuery, roleFilter, statusFilter]);

    // ─── Modal Handlers ───────────────────────────────────────────────────────
    const openAddModal = () => {
        setIsEditMode(false);
        setEditingUserId(null);
        setFFullName('');
        setFEmail('');
        setFPassword('');
        setFRole('');
        setIsUserModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const openEditModal = (userId: string) => {
        const u = allUsers.find(x => x.id === userId);
        if (!u) return;

        setIsEditMode(true);
        setEditingUserId(userId);
        setFFullName(u.full_name || '');
        setFRole(u.role || '');
        setIsUserModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeUserModal = () => {
        setIsUserModalOpen(false);
        setEditingUserId(null);
        document.body.style.overflow = '';
    };

    const handleSaveUser = async () => {
        const fullName = fFullName.trim();
        const role = fRole;

        if (!fullName) { showToast('Please enter a full name.', true); return; }
        if (!role) { showToast('Please select a role.', true); return; }

        setIsSaving(true);

        if (isEditMode && editingUserId) {
            // Update existing user
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName, role })
                .eq('id', editingUserId);

            setIsSaving(false);

            if (error) {
                showToast('Error updating user: ' + error.message, true);
                return;
            }
            showToast(`${fullName}'s profile updated successfully.`);
            closeUserModal();
            loadUsers();
        } else {
            // Create new user
            const email = fEmail.trim();
            const password = fPassword;

            if (!email) { showToast('Please enter an email.', true); setIsSaving(false); return; }
            if (password.length < 6) { showToast('Password must be at least 6 characters.', true); setIsSaving(false); return; }

            const { data: { session: adminSession } } = await supabase.auth.getSession();
            const adminEmail = adminSession?.user?.email || '';
            const adminPassword = prompt('Re-enter your admin password to confirm user creation:');

            if (!adminPassword) {
                setIsSaving(false);
                return;
            }

            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName, role } }
            });

            if (authError) {
                setIsSaving(false);
                showToast('Error creating account: ' + authError.message, true);
                return;
            }

            // Restore Admin Session
            const { error: reLoginError } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            });

            setIsSaving(false);

            if (reLoginError) {
                alert('User created but could not restore admin session. Please log in again.');
                window.location.href = '/pages/login.html';
                return;
            }

            showToast(`User ${fullName} created successfully.`);
            closeUserModal();
            loadUsers();
        }
    };

    // ─── Delete Handlers ──────────────────────────────────────────────────────
    const openConfirmDelete = (id: string, name: string) => {
        setUserToDelete({ id, name });
        setIsConfirmModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setUserToDelete(null);
        document.body.style.overflow = '';
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        setIsSaving(true);
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userToDelete.id);

        setIsSaving(false);

        if (error) {
            showToast('Error deleting user: ' + error.message, true);
            closeConfirmModal();
            return;
        }

        showToast(`${userToDelete.name} has been permanently deleted.`);
        closeConfirmModal();
        loadUsers();
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-neutral-950 overflow-hidden w-full font-['Plus_Jakarta_Sans',sans-serif]">
            <ToastComponent />

            <Sidebar
                activePage={activePage}
                userName={userName}
                userInitials={userInitials}
                userRole="Administrator"
                navItems={navItems}
                onNavigate={(id) => setActivePage(id)}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <main className="flex-1 overflow-auto md:ml-[240px]">
                {/* ─── Topbar ─── */}
                <header className="h-[64px] md:h-[72px] w-full bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h1 className="font-bold text-slate-800 dark:text-neutral-100 hidden sm:block">User Management</h1>
                    </div>
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 ${!isOnline ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${!isOnline ? 'bg-amber-500' : 'bg-green-500'}`} />
                            </span>
                            <span className={`text-[0.65rem] font-extrabold uppercase tracking-widest ${!isOnline ? 'text-amber-700' : 'text-green-700'}`}>
                                {!isOnline ? 'Offline Mode' : 'System Online'}
                            </span>
                        </div>
                        <ThemeToggle />
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 dark:text-neutral-100 leading-tight">{userName}</div>
                            <div className="text-[0.7rem] text-slate-500 dark:text-neutral-400">Administrator</div>
                        </div>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer shrink-0">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-8 max-w-[1400px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
                    {/* Welcome Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">User Management</h1>
                            <p className="text-sm text-slate-500 mt-1">Create, edit, assign roles, and manage system user accounts.</p>
                        </div>
                        <div className="sm:self-end flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Live Data
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-200 hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">👥</div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Users</div>
                                <div className="text-2xl font-black text-slate-800 leading-none">{allUsers.length}</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-green-200 hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">✅</div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active</div>
                                <div className="text-2xl font-black text-slate-800 leading-none">{allUsers.length}</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-red-200 hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🗑</div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Deleted</div>
                                <div className="text-2xl font-black text-slate-800 leading-none">0</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-indigo-200 hover:shadow-md transition-all">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🔑</div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Roles</div>
                                <div className="text-2xl font-black text-slate-800 leading-none">{ROLES.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        {/* Card Header */}
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">System Users</h2>
                                <p className="text-sm text-slate-500">Manage accounts and role assignments</p>
                            </div>
                            <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95 shrink-0 justify-center">
                                <span className="text-lg">➕</span> Add User
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 transition-all min-w-[140px] cursor-pointer"
                                >
                                    <option value="">All Roles</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="nurse">Nurse</option>
                                    <option value="BHW">BHW</option>
                                    <option value="midwives">Midwives</option>
                                    <option value="pharmacist">Pharmacist</option>
                                    <option value="laboratory">Laboratory</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 transition-all min-w-[120px] cursor-pointer"
                                >
                                    <option value="active">Active</option>
                                    <option value="deleted">Deleted</option>
                                    <option value="all">All</option>
                                </select>
                            </div>
                        </div>

                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-[minmax(0,2fr)_150px_100px_180px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-400">
                            <div>User</div>
                            <div>Role</div>
                            <div>Status</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {/* Table List */}
                        <div className="flex flex-col flex-1">
                            {isLoading ? (
                                <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading users...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="p-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center text-3xl mb-4">👥</div>
                                    <h3 className="text-lg font-bold text-slate-700">No Users Found</h3>
                                    <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredUsers.map(u => {
                                        const av = (u.full_name?.[0] || '?').toUpperCase();
                                        const colorClass = getAvatarColor(u.role);
                                        return (
                                            <div key={u.id} className="flex flex-col md:grid md:grid-cols-[minmax(0,2fr)_150px_100px_180px] md:items-center gap-4 p-5 hover:bg-slate-50/80 transition-colors group">
                                                {/* User Info */}
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm ${colorClass}`}>
                                                        {av}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-800 truncate">{u.full_name || '—'}</div>
                                                        <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{u.email || '—'}</div>
                                                    </div>
                                                </div>

                                                {/* Role */}
                                                <div className="flex items-center md:pl-0 pl-[54px] -mt-2 md:mt-0">
                                                    <RoleBadge role={u.role} />
                                                </div>

                                                {/* Status */}
                                                <div className="flex items-center md:pl-0 pl-[54px] -mt-2 md:mt-0">
                                                    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center md:justify-end gap-2 md:pl-0 pl-[54px] mt-2 md:mt-0">
                                                    <button onClick={() => openEditModal(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shadow-sm">
                                                        ✏️ Edit
                                                    </button>
                                                    <button onClick={() => openConfirmDelete(u.id, u.full_name || 'User')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm">
                                                        🗑 Delete
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── Add/Edit User Modal ─── */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) closeUserModal(); }}>
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{isEditMode ? `Edit: ${fFullName}` : 'Add New User'}</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">{isEditMode ? 'Update name or role assignment' : 'Create a new system account'}</p>
                            </div>
                            <button onClick={closeUserModal} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-100 text-lg transition-colors">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                <input type="text" value={fFullName} onChange={e => setFFullName(e.target.value)} placeholder="e.g. Dr. Juan Dela Cruz" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                            </div>

                            {!isEditMode && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                        <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="e.g. user@medisens.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                        <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                                    </div>
                                </>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Assignment</label>
                                <select value={fRole} onChange={e => setFRole(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
                                    <option value="" disabled>Select a role...</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="nurse">Nurse</option>
                                    <option value="BHW">BHW</option>
                                    <option value="midwives">Midwives</option>
                                    <option value="pharmacist">Pharmacist</option>
                                    <option value="laboratory">Laboratory</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={closeUserModal} disabled={isSaving} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleSaveUser} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 min-w-[140px] justify-center text-center">
                                {isSaving ? '⏳ Saving...' : isEditMode ? '💾 Save Changes' : '➕ Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Confirm Delete Modal ─── */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget && !isSaving) closeConfirmModal(); }}>
                    <div className="bg-white w-full max-w-[360px] rounded-[24px] shadow-2xl flex flex-col items-center p-8 animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-inner">🗑</div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Delete User?</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-8">
                            Are you sure you want to permanently delete <strong className="text-slate-800 font-bold">{userToDelete?.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex w-full gap-3">
                            <button onClick={closeConfirmModal} disabled={isSaving} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleDeleteUser} disabled={isSaving} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 shadow-md shadow-red-500/20 transition-all disabled:opacity-50">
                                {isSaving ? '⏳ Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<AdminDashboard />);
