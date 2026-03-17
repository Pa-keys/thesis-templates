import { supabase } from './supabase';

export type Role = 'doctor' | 'nurse' | 'BHW' | 'pharmacist' | 'labaratory' | 'admin';

const ROLE_DASHBOARD: Record<Role, string> = {
    doctor:      'doctor.html',
    nurse:       'nurse.html',
    BHW:         'bhw.html',
    pharmacist:  'pharmacist.html',
    labaratory:  'laboratory.html',
    admin:       'admin.html',
};

// Call this on every dashboard page to guard access
// Pass the expected role for that page
export async function requireRole(expectedRole: Role): Promise<{ userId: string; role: Role; fullName: string }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        throw new Error('Not authenticated');
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        throw new Error('Profile not found');
    }

    if (profile.role !== expectedRole) {
        window.location.href = ROLE_DASHBOARD[profile.role as Role] || 'login.html';
        throw new Error('Wrong role');
    }

    return { userId: session.user.id, role: profile.role as Role, fullName: profile.full_name };
}

// Call this on login page to redirect after sign in
export async function redirectToDashboard(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile?.role) {
        window.location.href = ROLE_DASHBOARD[profile.role as Role] || 'login.html';
    }
}

export async function logout(): Promise<void> {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
