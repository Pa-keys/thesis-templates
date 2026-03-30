import { supabase } from '../shared/supabase';

type Role = 'doctor' | 'nurse' | 'BHW' | 'pharmacist' | 'labaratory' | 'admin';

const ROLE_DASHBOARD: Record<Role, string> = {
    doctor:     '/pages/doctor.html',
    nurse:      '/pages/nurse.html',
    BHW:        '/pages/bhw.html',
    pharmacist: '/pages/pharmacist.html',
    labaratory: '/pages/laboratory.html',
    admin:      '/pages/admin.html',
};

// If already logged in, redirect immediately
const { data: { session } } = await supabase.auth.getSession();
if (session) redirectByRole(session.user.id);

// ─── Handle Login ─────────────────────────────────────────────────────────────
window.handleLogin = async function (): Promise<void> {
    const email    = (document.getElementById('emailInput') as HTMLInputElement).value.trim();
    const password = (document.getElementById('passwordInput') as HTMLInputElement).value;
    const btn      = document.getElementById('loginBtn')!;
    const spinner  = document.getElementById('spinner')!;
    const btnText  = document.getElementById('btnText')!;
    const errorMsg = document.getElementById('errorMsg')!;

    errorMsg.style.display = 'none';

    if (!email || !password) {
        showError('Please enter your email and password.');
        return;
    }

    // Loading state
    btn.classList.add('loading');
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
        stopLoading();
        showError('Invalid email or password. Please try again.');
        return;
    }

    await redirectByRole(data.user.id);
};

async function redirectByRole(userId: string): Promise<void> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        stopLoading();
        showError('Account profile not found. Contact your administrator.');
        await supabase.auth.signOut();
        return;
    }

    const dashboard = ROLE_DASHBOARD[profile.role as Role];
    if (dashboard) {
        window.location.href = dashboard;
    } else {
        stopLoading();
        showError(`Unknown role "${profile.role}". Contact your administrator.`);
    }
}

function showError(msg: string): void {
    const el = document.getElementById('errorMsg')!;
    el.textContent = msg;
    el.style.display = 'block';
}

function stopLoading(): void {
    document.getElementById('loginBtn')!.classList.remove('loading');
    document.getElementById('btnText')!.style.display = 'block';
    document.getElementById('spinner')!.style.display = 'none';
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') (window as any).handleLogin();
});

declare global {
    interface Window {
        handleLogin: () => Promise<void>;
    }
}