import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabase';
import { requireRole, logout } from '../shared/auth';
import ReactDOM from 'react-dom/client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface InitialConsultationData {
  dateOfConsultation: string; consultationTime: string;
  referredBy: string; modeOfTransaction: string; modeOfTransfer: string;
  chiefComplaints: string; diagnosis: string; historyOfPresentIllness: string;
  bp: string; hr: string; rr: string; temp: string; weight: string;
  height: string; o2Sat: string; muac: string; nutritionalStatus: string;
  bmi: string; visualAcuityLeft: string; visualAcuityRight: string;
  bloodType: string; generalSurvey: string;
}

const EMPTY_FORM: InitialConsultationData = {
  dateOfConsultation: '', consultationTime: '', referredBy: '', modeOfTransaction: '', modeOfTransfer: '',
  chiefComplaints: '', diagnosis: '', historyOfPresentIllness: '',
  bp: '', hr: '', rr: '', temp: '', weight: '', height: '', o2Sat: '', muac: '',
  nutritionalStatus: '', bmi: '', visualAcuityLeft: '', visualAcuityRight: '', bloodType: '', generalSurvey: '',
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const toNumberOrNull = (val: string) => {
  if (!val || val.trim() === '') return null;
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
};

// ─── Get patient ID from URL ──────────────────────────────────────────────────
const patientId = new URLSearchParams(window.location.search).get('id');

// ─── Component ────────────────────────────────────────────────────────────────
function InitialConsultation() {
  const [formData, setFormData]       = useState<InitialConsultationData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [userName, setUserName]       = useState('Loading...');
  const [userInitials, setUserInitials] = useState('');
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  // ─── Auth + Patient load ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Auth
      const profile = await requireRole('nurse');
      const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      setUserName(profile.fullName);
      setUserInitials(initials);

      // Load patient name for the header
      if (!patientId) { setPatientName('Unknown Patient'); return; }
      const { data } = await supabase
        .from('patients')
        .select('firstName, middleName, lastName')
        .eq('id', patientId)
        .single();
      if (data) {
        setPatientName(`${data.lastName}, ${data.firstName} ${data.middleName || ''}`.trim());
      }
    })();
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) { alert('No patient ID found in URL.'); return; }
    setIsSubmitting(true);

    try {
      // 1. initial_consultation
      const { error: e1 } = await supabase.from('initial_consultation').insert([{
        patient_id:          patientId,
        consultation_date:   formData.dateOfConsultation || null,
        consultation_time:   formData.consultationTime   || null,
        mode_of_transaction: formData.modeOfTransaction  || null,
        referred_by:         formData.referredBy         || null,
        mode_of_transfer:    formData.modeOfTransfer     || null,
        chief_complaint:     formData.chiefComplaints    || null,
        diagnosis:           formData.diagnosis          || null,
      }]);
      if (e1) throw new Error('initial_consultation: ' + e1.message);

      // 2. vital_sign
      const { error: e2 } = await supabase.from('vital_sign').insert([{
        patient_id:          patientId,
        bp:                  formData.bp                 || null,
        heart_rate:          toNumberOrNull(formData.hr),
        respiratory_rate:    toNumberOrNull(formData.rr),
        temperature:         toNumberOrNull(formData.temp),
        o2_saturation:       toNumberOrNull(formData.o2Sat),
        weight:              toNumberOrNull(formData.weight),
        height:              toNumberOrNull(formData.height),
        muac:                toNumberOrNull(formData.muac),
        nutritional_status:  formData.nutritionalStatus  || null,
        bmi:                 toNumberOrNull(formData.bmi),
        visual_acuity_left:  formData.visualAcuityLeft   || null,
        visual_acuity_right: formData.visualAcuityRight  || null,
        general_survey:      formData.generalSurvey      || null,
      }]);
      if (e2) throw new Error('vital_sign: ' + e2.message);

      showToast('Consultation record saved successfully!', true);
      setFormData(EMPTY_FORM);

    } catch (err: any) {
      console.error(err);
      showToast('Failed to save: ' + err.message, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const inputStyle  = "w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors";
  const labelStyle  = "block text-xs font-700 uppercase tracking-wide text-gray-500 mb-1";
  const sectionStyle = "bg-white rounded-xl shadow-sm border border-gray-100 mb-5 overflow-hidden";
  const legendStyle = "w-full px-6 py-4 border-b border-gray-100 text-sm font-800 text-gray-700 uppercase tracking-wide bg-gray-50";

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.ok ? '#F0FDF4' : '#FFF1F2',
          border: `1px solid ${toast.ok ? '#BBF7D0' : '#FECDD3'}`,
          color: toast.ok ? '#15803D' : '#BE123C',
          borderRadius: 12, padding: '12px 20px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24"><path d="M12 2a1 1 0 0 1 1 1v4h4a1 1 0 0 1 0 2h-4v4a1 1 0 0 1-2 0V9H7a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1z"/><path d="M4 16a8 8 0 0 1 16 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4z"/></svg>
          </div>
          <div className="logo-text">
            <div className="l-name">MediSens</div>
            <div className="l-sub">Rural Health Unit</div>
          </div>
        </div>

        <div className="nav-group-label">Main Menu</div>
        <a className="nav-item" href="nurse.html"><span className="nav-icon">🏠</span> Dashboard</a>
        <a className="nav-item active" href="#"><span className="nav-icon">📋</span> Consultation</a>

        <div className="nav-group-label">System</div>
        <a className="nav-item" href="#"><span className="nav-icon">⚙️</span> Settings</a>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-av av-blue">{userInitials}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">Nurse</div>
            </div>
            <button className="logout-icon-btn" onClick={logout} title="Sign out">⇥</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button
              onClick={() => window.location.href = 'nurse.html'}
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 9, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ← Back
            </button>
            <div className="topbar-page" style={{ marginLeft: 12 }}>Initial Consultation</div>
          </div>
          <div className="topbar-right">
            <div className="online-pill"><div className="pulse-dot"></div>System Online</div>
            <div className="topbar-user-wrap">
              <div className="topbar-user-text">
                <div className="topbar-user-name">{userName}</div>
                <div className="topbar-user-role">Nurse</div>
              </div>
              <div className="topbar-av av-blue">{userInitials}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {/* Patient header */}
          <div className="welcome-row" style={{ marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: '1.2rem', marginBottom: 2 }}>📋 Initial Consultation</h1>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Patient: <strong style={{ color: 'var(--text)' }}>{patientName || '—'}</strong>
              </p>
            </div>
            <div className="sync-chip"><div className="sync-dot"></div>Live • Auto-saves</div>
          </div>

          <form onSubmit={handleSubmit} style={{ maxWidth: 960 }}>

            {/* SECTION: General Information */}
            <fieldset className={sectionStyle} style={{ border: 'none' }}>
              <legend className={legendStyle}>General Information</legend>
              <div style={{ padding: '20px 24px' }}>
                <div className="modal-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div className="field">
                    <label className={labelStyle}>Date of Consultation</label>
                    <input type="date" name="dateOfConsultation" value={formData.dateOfConsultation} onChange={handleChange} className={inputStyle} required />
                  </div>
                  <div className="field">
                    <label className={labelStyle}>Consultation Time</label>
                    <input type="time" name="consultationTime" value={formData.consultationTime} onChange={handleChange} className={inputStyle} />
                  </div>
                  <div className="field">
                    <label className={labelStyle}>Referred From / By</label>
                    <input type="text" name="referredBy" value={formData.referredBy} onChange={handleChange} className={inputStyle} placeholder="Name or Department" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
                  <div>
                    <label className={labelStyle} style={{ marginBottom: 8 }}>Mode of Transaction</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {['Walk in', 'Referral'].map(v => (
                        <label key={v} className="radio-opt" style={{ fontSize: '0.82rem' }}>
                          <input type="radio" name="modeOfTransaction" value={v} onChange={handleRadioChange} checked={formData.modeOfTransaction === v} style={{ display: 'none' }} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle} style={{ marginBottom: 8 }}>Mode of Transfer</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {['Ambulatory', 'Via Wheelchair'].map(v => (
                        <label key={v} className="radio-opt" style={{ fontSize: '0.82rem' }}>
                          <input type="radio" name="modeOfTransfer" value={v} onChange={handleRadioChange} checked={formData.modeOfTransfer === v} style={{ display: 'none' }} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* SECTION: Clinical Notes */}
            <fieldset className={sectionStyle} style={{ border: 'none' }}>
              <legend className={legendStyle}>Clinical Notes</legend>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label className={labelStyle}>Chief Complaints</label>
                  <textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} rows={3} className={inputStyle} placeholder="Patient's primary symptoms..." style={{ resize: 'vertical' }}></textarea>
                </div>
                <div className="field">
                  <label className={labelStyle}>Diagnosis</label>
                  <textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} rows={2} className={inputStyle} style={{ resize: 'vertical' }}></textarea>
                </div>
                <div className="field">
                  <label className={labelStyle}>History of Present Illnesses</label>
                  <textarea name="historyOfPresentIllness" value={formData.historyOfPresentIllness} onChange={handleChange} rows={3} className={inputStyle} style={{ resize: 'vertical' }}></textarea>
                </div>
              </div>
            </fieldset>

            {/* SECTION: Vital Signs */}
            <fieldset className={sectionStyle} style={{ border: 'none' }}>
              <legend className={legendStyle}>Physical Examination & Vital Signs</legend>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  {[
                    { label: 'BP (mmHg)', name: 'bp', type: 'text', placeholder: '120/80' },
                    { label: 'Heart Rate (bpm)', name: 'hr', type: 'number' },
                    { label: 'Resp. Rate (cpm)', name: 'rr', type: 'number' },
                    { label: 'Temp (°C)', name: 'temp', type: 'number', step: '0.1' },
                    { label: 'O2 Sat (%)', name: 'o2Sat', type: 'number' },
                    { label: 'Weight (kg)', name: 'weight', type: 'number', step: '0.1' },
                    { label: 'Height (cm)', name: 'height', type: 'number', step: '0.1' },
                    { label: 'BMI', name: 'bmi', type: 'text' },
                    { label: 'MUAC', name: 'muac', type: 'text' },
                    { label: 'Nutritional Status', name: 'nutritionalStatus', type: 'text' },
                    { label: 'Visual Acuity (L)', name: 'visualAcuityLeft', type: 'text', placeholder: '20/20' },
                    { label: 'Visual Acuity (R)', name: 'visualAcuityRight', type: 'text', placeholder: '20/20' },
                    { label: 'Blood Type', name: 'bloodType', type: 'text', placeholder: 'O+' },
                  ].map(f => (
                    <div className="field" key={f.name}>
                      <label className={labelStyle}>{f.label}</label>
                      <input type={f.type} name={f.name} value={(formData as any)[f.name]} onChange={handleChange} className={inputStyle} placeholder={(f as any).placeholder || ''} step={(f as any).step} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <label className={labelStyle} style={{ marginBottom: 8 }}>General Survey</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['Awake and Alert', 'Altered Sensorium'].map(v => (
                      <label key={v} className={`radio-opt${formData.generalSurvey === v ? ' sel' : ''}`} style={{ fontSize: '0.82rem' }}>
                        <input type="radio" name="generalSurvey" value={v} onChange={handleRadioChange} checked={formData.generalSurvey === v} style={{ display: 'none' }} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, marginBottom: 32 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: isSubmitting ? '#93C5FD' : 'var(--blue)',
                  color: 'white', border: 'none', borderRadius: 10,
                  padding: '11px 28px', fontSize: '0.9rem', fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 12px rgba(37,99,235,0.3)',
                  transition: 'background 0.15s',
                }}
              >
                {isSubmitting ? '⏳ Saving Record...' : '💾 Save Consultation Record'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InitialConsultation />
  </React.StrictMode>
);