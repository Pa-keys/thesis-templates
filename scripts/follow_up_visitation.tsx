import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../shared/supabase';
import SignatureCanvas from 'react-signature-canvas';

interface FollowUpData {
  date: string; time: string; modeOfTx: string; modeOfTransfer: string;
  chiefComplaint: string; diagnosis: string; hpi: string;
  vitals: { bp: string; hr: string; rr: string; temp: string; o2: string; wt: string; ht: string; muac: string; nutStatus: string; bmi: string; vaL: string; vaR: string; bloodType: string; genSurvey: string; };
  medicationTreatment: string; labResults: string; signatureUrl: string;
}

function FollowUp() {
  const [role, setRole] = useState<string | null>(null);
  const [formData, setFormData] = useState<FollowUpData>({
    date: '', time: '', modeOfTx: '', modeOfTransfer: '', chiefComplaint: '', diagnosis: '', hpi: '',
    vitals: { bp: '', hr: '', rr: '', temp: '', o2: '', wt: '', ht: '', muac: '', nutStatus: '', bmi: '', vaL: '', vaR: '', bloodType: '', genSurvey: '' },
    medicationTreatment: '', labResults: '', signatureUrl: ''
  });
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  // RBAC Guard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return window.location.href = 'login.html';
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (!data || !['doctor', 'nurse'].includes(data.role)) return window.location.href = 'login.html';
      setRole(data.role);
    });
  }, []);

  const handleVitalChange = (field: string, value: string) => setFormData(prev => ({ ...prev, vitals: { ...prev.vitals, [field]: value } }));

  // Helper for safe number conversion
  const toNumberOrNull = (val: string) => {
    if (!val || val.trim() === '') return null;
    const parsed = Number(val);
    return isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patientId = new URLSearchParams(window.location.search).get('id');

    try {
      const sigUrl = sigCanvas.current?.getCanvas().toDataURL('image/png') || '';
      const { error } = await supabase.from('follow_up').insert([{ 
        patient_id: patientId || null,
        visit_date: formData.date || null,
        visit_time: formData.time || null,
        mode_of_transaction: formData.modeOfTx || null,
        mode_of_transfer: formData.modeOfTransfer || null,
        chief_complaint: formData.chiefComplaint || null,
        diagnosis: formData.diagnosis || null,
        history_of_present_illness: formData.hpi || null,
        
        bp: formData.vitals.bp || null,
        heart_rate: toNumberOrNull(formData.vitals.hr),
        respiratory_rate: toNumberOrNull(formData.vitals.rr),
        temperature: toNumberOrNull(formData.vitals.temp),
        o2_saturation: toNumberOrNull(formData.vitals.o2),
        weight: toNumberOrNull(formData.vitals.wt),
        height: toNumberOrNull(formData.vitals.ht),
        muac: toNumberOrNull(formData.vitals.muac),
        nutritional_status: formData.vitals.nutStatus || null,
        bmi: toNumberOrNull(formData.vitals.bmi),
        visual_acuity_left: formData.vitals.vaL || null,
        visual_acuity_right: formData.vitals.vaR || null,
        blood_type: formData.vitals.bloodType || null,
        general_survey: formData.vitals.genSurvey || null,
        
        medication_treatment: formData.medicationTreatment || null,
        lab_results: formData.labResults || null,
        signature_url: sigUrl
      }]);
      
      if (error) throw error;
      alert('Follow-up record saved successfully!');
      sigCanvas.current?.clear();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  if (!role) return <div>Loading...</div>;

  const inputStyle = "w-full border border-gray-300 p-2 rounded text-sm";
  const labelStyle = "block text-xs font-bold text-gray-600 mb-1";

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow rounded-lg mt-8">
      <h2 className="text-lg font-bold bg-gray-200 p-2 uppercase border border-black mb-4">IV. FOLLOW-UP VISITS - FOR RHU PERSONNEL ONLY</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div><label className={labelStyle}>Date</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputStyle} /></div>
          <div><label className={labelStyle}>Time</label><input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className={inputStyle} /></div>
          <div><label className={labelStyle}>Mode of Tx</label><select value={formData.modeOfTx} onChange={e => setFormData({...formData, modeOfTx: e.target.value})} className={inputStyle}><option value="">Select...</option><option value="Walk-in">Walk-in</option><option value="Referral">Referral</option></select></div>
          <div><label className={labelStyle}>Mode of Transfer</label><select value={formData.modeOfTransfer} onChange={e => setFormData({...formData, modeOfTransfer: e.target.value})} className={inputStyle}><option value="">Select...</option><option value="Ambulatory">Ambulatory</option><option value="Wheelchair">Via wheelchair</option></select></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelStyle}>Chief Complaints</label><textarea rows={2} value={formData.chiefComplaint} onChange={e => setFormData({...formData, chiefComplaint: e.target.value})} className={inputStyle} /></div>
          <div><label className={labelStyle}>Diagnosis</label><textarea rows={2} value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} className={inputStyle} disabled={role === 'nurse'}/></div>
        </div>
        
        <div><label className={labelStyle}>History of Present Illness</label><textarea rows={2} value={formData.hpi} onChange={e => setFormData({...formData, hpi: e.target.value})} className={inputStyle} /></div>

        <h3 className="font-bold text-sm mt-6 border-b pb-1">Pertinent Physical Examination (Vital Signs)</h3>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(formData.vitals).map(([k, v]) => (
            <div key={k}><label className={labelStyle}>{k.toUpperCase()}</label><input type="text" value={v} onChange={e => handleVitalChange(k, e.target.value)} className={inputStyle} /></div>
          ))}
        </div>

        <div><label className={labelStyle}>Medication and Treatment</label><textarea rows={4} value={formData.medicationTreatment} onChange={e => setFormData({...formData, medicationTreatment: e.target.value})} className={inputStyle} disabled={role === 'nurse'}/></div>
        <div><label className={labelStyle}>Laboratory Result/s</label><textarea rows={3} value={formData.labResults} onChange={e => setFormData({...formData, labResults: e.target.value})} className={inputStyle} disabled={role === 'nurse'}/></div>

        <div className="flex justify-end mt-6">
          <div className="w-80">
            <label className={labelStyle}>Name and Signature of Health Care Provider</label>
            <div className="border border-gray-400 bg-gray-50 rounded h-24 mb-1"><SignatureCanvas ref={sigCanvas} canvasProps={{ className: 'w-full h-full' }} /></div>
            <button type="button" onClick={() => sigCanvas.current?.clear()} className="text-xs text-gray-500">Clear</button>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 rounded mt-4">Save Follow-up Record</button>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><FollowUp /></React.StrictMode>);