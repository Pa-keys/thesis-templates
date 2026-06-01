import { supabase } from '../supabase/client';
import type { Role } from '../../types/user';

const ROLE_DASHBOARD: Record<Role, string> = {
    doctor:     '/pages/doctor.html',
    nurse:      '/pages/nurse.html',
    BHW:        '/pages/bhw.html',
    pharmacist: '/pages/pharmacist.html',
    labaratory: '/pages/laboratory.html',
    admin:      '/pages/admin.html',
    midwives:   '/pages/midwife.html',
};

export async function requireRole(expectedRole: Role): Promise<{ userId: string; role: Role; fullName: string }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = '/pages/login.html';
        throw new Error('Not authenticated');
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) {
        await supabase.auth.signOut();
        window.location.href = '/pages/login.html';
        throw new Error('Profile not found');
    }

    if (profile.role !== expectedRole) {
        window.location.href = ROLE_DASHBOARD[profile.role as Role] || '/pages/login.html';
        throw new Error('Wrong role');
    }

    return { userId: session.user.id, role: profile.role as Role, fullName: profile.full_name };
}

export async function redirectToDashboard(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile?.role) {
        window.location.href = ROLE_DASHBOARD[profile.role as Role] || '/pages/login.html';
    }
}

export async function logout(): Promise<void> {
    await supabase.auth.signOut();
    window.location.href = '/pages/login.html';
}
