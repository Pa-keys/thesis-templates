/// <reference types="vite/client" />

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ConsentProps {
    patientId: string;
    patientName: string;
    rhuPersonnel?: string;      // ← ADDED
    onConsentSaved: () => void;
}

// ─── Inline styles matching the details.html design system ───────────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },

    // ── Card shell ──
    card: {
        background: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        background: '#EFF6FF',
        borderBottom: '1px solid #DBEAFE',
    },
    cardHeaderIcon: {
        width: '30px',
        height: '30px',
        borderRadius: '7px',
        background: '#2563EB',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.85rem',
        flexShrink: 0,
    },
    cardHeaderTitle: {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#2563EB',
    },
    cardBody: {
        padding: '24px',
    },

    // ── Consent text ──
    consentText: {
        fontSize: '0.875rem',
        color: '#475569',
        lineHeight: '1.75',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '16px 20px',
    },
    consentHighlight: {
        color: '#1E3A8A',
        fontWeight: 600,
    },

    // ── Signature block ──
    sigSection: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    },
    sigLabel: {
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.8px',
        color: '#475569',
    },
    sigWrapper: {
        border: '1.5px dashed #CBD5E1',
        borderRadius: '12px',
        background: '#F8FAFC',
        overflow: 'hidden',
        position: 'relative' as const,
        transition: 'border-color 0.15s',
    },
    sigWrapperFocused: {
        borderColor: '#2563EB',
        background: '#FAFBFF',
    },
    sigHint: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '0.75rem',
        color: '#CBD5E1',
        fontWeight: 500,
        pointerEvents: 'none' as const,
        userSelect: 'none' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '4px',
    },
    clearBtn: {
        alignSelf: 'flex-start' as const,
        padding: '5px 12px',
        border: '1.5px solid #E2E8F0',
        borderRadius: '7px',
        background: '#F1F5F9',
        color: '#64748B',
        fontFamily: 'inherit',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
    },

    // ── Sig grid ──
    sigGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
    },

    // ── Input field ──
    inputGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '5px',
    },
    inputLabel: {
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.8px',
        color: '#475569',
    },
    input: {
        padding: '9px 12px',
        border: '1.5px solid #E2E8F0',
        borderRadius: '12px',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        color: '#0F172A',
        background: '#F1F5F9',
        outline: 'none',
        minHeight: '40px',
    },
    inputDisabled: {
        padding: '9px 12px',
        border: '1.5px solid #E2E8F0',
        borderRadius: '12px',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        color: '#64748B',
        background: '#F8FAFC',
        outline: 'none',
        minHeight: '40px',
    },

    // ── Personnel grid ──
    personnelGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
    },

    // ── Divider ──
    divider: {
        height: '1px',
        background: '#E2E8F0',
        margin: '4px 0',
    },

    // ── Submit button ──
    submitBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '13px 24px',
        background: '#2563EB',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontFamily: 'inherit',
        fontSize: '0.9rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
        transition: 'background 0.15s, transform 0.1s',
        marginTop: '4px',
    },
    submitBtnDisabled: {
        background: '#93C5FD',
        cursor: 'not-allowed',
        boxShadow: 'none',
        transform: 'none',
    },

    // ── Badge ──
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '20px',
        fontSize: '0.72rem',
        fontWeight: 600,
        color: '#1D4ED8',
        marginLeft: 'auto',
    },
};

// ─── Signature Pad Sub-Component ──────────────────────────────────────────────
function SigPad({
    label,
    sigRef,
    penColor = 'black',
    onClear,
}: {
    label: string;
    sigRef: React.RefObject<SignatureCanvas | null>;
    penColor?: string;
    onClear: () => void;
}) {
    const [active, setActive] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    return (
        <div style={styles.sigSection}>
            <div style={styles.sigLabel}>{label}</div>
            <div style={{ ...styles.sigWrapper, ...(active ? styles.sigWrapperFocused : {}) }}>
                {!hasContent && (
                    <div style={styles.sigHint}>
                        <span style={{ fontSize: '1.2rem' }}>✍️</span>
                        <span>Sign here</span>
                    </div>
                )}
                <SignatureCanvas
                    ref={sigRef}
                    penColor={penColor}
                    onBegin={() => { setActive(true); setHasContent(true); }}
                    onEnd={() => setActive(false)}
                    canvasProps={{
                        width: 380,
                        height: 160,
                        style: { display: 'block', width: '100%', height: '160px' },
                    }}
                />
            </div>
            <button
                type="button"
                style={styles.clearBtn}
                onClick={() => { onClear(); setHasContent(false); }}
                onMouseEnter={e => {
                    (e.target as HTMLButtonElement).style.background = '#E2E8F0';
                    (e.target as HTMLButtonElement).style.color = '#0F172A';
                }}
                onMouseLeave={e => {
                    (e.target as HTMLButtonElement).style.background = '#F1F5F9';
                    (e.target as HTMLButtonElement).style.color = '#64748B';
                }}
            >
                ↺ Clear
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PatientConsent({ patientId, patientName, rhuPersonnel: initialPersonnel = '', onConsentSaved }: ConsentProps) {
    // ← CHANGED: pre-filled from prop, locked as read-only
    const [rhuPersonnel] = useState(initialPersonnel);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const patientSigCanvas = useRef<SignatureCanvas | null>(null);
    const personnelSigCanvas = useRef<SignatureCanvas | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (patientSigCanvas.current?.isEmpty()) {
            alert("Please provide the patient's signature.");
            return;
        }
        if (personnelSigCanvas.current?.isEmpty()) {
            alert("Please provide the RHU Personnel's signature.");
            return;
        }

        setIsSubmitting(true);

        try {
            const patientSignatureDataUrl = patientSigCanvas.current?.getCanvas().toDataURL('image/png');
            const personnelSignatureDataUrl = personnelSigCanvas.current?.getCanvas().toDataURL('image/png');

            // Using standard insert for Option 2
            const { error } = await supabase
                .from('patient_consent')
                .insert([{
                    patient_id: patientId,
                    consent_signer: true,
                    consent_signature: patientSignatureDataUrl,
                    consent_personnel: rhuPersonnel,
                    consent_personnel_signature: personnelSignatureDataUrl,
                    consent_date: new Date().toISOString()
                }]);

            if (error) {
                alert("Database Error: " + error.message);
            } else {
                // Removed the old !data check since standard insert doesn't return data without .select()
                alert("Consent successfully recorded!");
                onConsentSaved();
            }
        } catch (err: any) {
            alert("A critical error occurred: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} style={styles.page}>

            {/* ── Section I: Consent Text ── */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={styles.cardHeaderIcon}>📋</div>
                    <div style={styles.cardHeaderTitle}>IV. Patient Consent &amp; Data Privacy</div>
                    <div style={styles.badge}>
                        <span>🔒</span> RA 10173
                    </div>
                </div>
                <div style={styles.cardBody}>
                    <p style={styles.consentText}>
                        I hereby give my consent to the{' '}
                        <span style={styles.consentHighlight}>Malvar Rural Health Unit</span> to collect,
                        process, and store my personal and medical information for the purpose of healthcare
                        delivery, diagnosis, treatment, and referral. I understand that my records will be
                        kept confidential in accordance with the{' '}
                        <span style={styles.consentHighlight}>Data Privacy Act of 2012 (RA 10173)</span>.
                        I certify that the information provided is true and correct to the best of my knowledge.
                    </p>
                </div>
            </div>

            {/* ── Section II: Signatures ── */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={styles.cardHeaderIcon}>✍️</div>
                    <div style={styles.cardHeaderTitle}>Signatures</div>
                </div>
                <div style={styles.cardBody}>
                    <div style={styles.sigGrid}>
                        <SigPad
                            label="Patient Signature"
                            sigRef={patientSigCanvas}
                            penColor="#0F172A"
                            onClear={() => patientSigCanvas.current?.clear()}
                        />
                        <SigPad
                            label="RHU Personnel Signature"
                            sigRef={personnelSigCanvas}
                            penColor="#1D4ED8"
                            onClear={() => personnelSigCanvas.current?.clear()}
                        />
                    </div>
                </div>
            </div>

            {/* ── Section III: Printed Names ── */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={styles.cardHeaderIcon}>🪪</div>
                    <div style={styles.cardHeaderTitle}>Printed Names</div>
                </div>
                <div style={styles.cardBody}>
                    <div style={styles.personnelGrid}>
                        <div style={styles.inputGroup}>
                            <label style={styles.inputLabel}>Patient Name</label>
                            <input
                                type="text"
                                value={patientName}
                                disabled
                                style={styles.inputDisabled}
                            />
                        </div>
                        {/* ← CHANGED: now disabled, auto-filled from logged-in user */}
                        <div style={styles.inputGroup}>
                            <label style={styles.inputLabel}>RHU Personnel (Printed Name)</label>
                            <input
                                type="text"
                                value={rhuPersonnel}
                                disabled
                                style={styles.inputDisabled}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Submit ── */}
            <button
                type="submit"
                disabled={isSubmitting}
                style={{
                    ...styles.submitBtn,
                    ...(isSubmitting ? styles.submitBtnDisabled : {}),
                }}
                onMouseEnter={e => {
                    if (!isSubmitting) {
                        (e.target as HTMLButtonElement).style.background = '#1D4ED8';
                        (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    }
                }}
                onMouseLeave={e => {
                    if (!isSubmitting) {
                        (e.target as HTMLButtonElement).style.background = '#2563EB';
                        (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                    }
                }}
            >
                {isSubmitting ? '⏳ Saving Consent...' : '✅ Confirm & Save Consent'}
            </button>
        </form>
    );
}