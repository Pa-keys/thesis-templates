import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../shared/supabase';
import SignatureCanvas from 'react-signature-canvas';

interface Medication { name: string; dosage: string; frequency: string; duration: string; quantity: string; }

interface PrescriptionData {
  patientId: string; date: string; name: string; age: string; sex: string; address: string;
  medications: Medication[]; licNo: string; ptrNo: string; signatureUrl: string;
}

function EPrescription() {
  const [role, setRole] = useState<string | null>(null);
  const [formData, setFormData] = useState<PrescriptionData>({
    patientId: '', date: new Date().toISOString().split('T')[0], name: '', age: '', sex: '', address: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', quantity: '' }],
    licNo: '', ptrNo: '', signatureUrl: ''
  });
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  // RBAC Guard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return window.location.href = 'login.html';
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (!data || !['doctor', 'pharmacist'].includes(data.role)) return window.location.href = 'login.html';
      setRole(data.role);
    });
  }, []);

  const handleAddMed = () => setFormData(f => ({ ...f, medications: [...f.medications, { name: '', dosage: '', frequency: '', duration: '', quantity: '' }] }));
  
  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...formData.medications];
    newMeds[index][field] = value;
    setFormData(f => ({ ...f, medications: newMeds }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'doctor' && sigCanvas.current?.isEmpty()) return alert('Doctor signature is required.');
    
    const sigUrl = sigCanvas.current?.getCanvas().toDataURL('image/png') || '';
    const patientId = new URLSearchParams(window.location.search).get('id');
    
    try {
      const { error } = await supabase.from('prescription').insert([{
        patient_id: patientId || null,
        prescription_date: formData.date || null,
        // Convert the medications array into a readable JSON string for your text column
        rx_content: JSON.stringify(formData.medications), 
        license_no: formData.licNo ? Number(formData.licNo) : null,
        ptr_no: formData.ptrNo || null,
        signature_url: sigUrl,
        status: 'Pending'
      }]);
      if (error) throw error;
      alert('Prescription saved successfully!');
      sigCanvas.current?.clear();
    } catch (err: any) {
      alert('Error saving prescription: ' + err.message);
    }
  };

  if (!role) return <div>Loading...</div>;

  const inputStyle = "w-full border-b border-gray-400 focus:border-blue-600 outline-none bg-transparent py-1 px-2 text-sm";

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 border-t-8 border-blue-800">
      <div className="flex justify-between items-center mb-8 border-b-2 border-gray-800 pb-4">
        <div className="text-center w-full">
          <h2 className="text-xl font-bold uppercase">Republic of the Philippines</h2>
          <h3 className="text-lg">Province of Batangas | Municipality of Malvar</h3>
          <h4 className="text-md font-bold">OFFICE OF THE MUNICIPAL HEALTH</h4>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div><label className="font-bold text-sm">DATE:</label><input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={inputStyle} /></div>
          <div></div>
          <div><label className="font-bold text-sm">NAME:</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputStyle} /></div>
          <div><label className="font-bold text-sm">AGE:</label><input type="text" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className={inputStyle} /></div>
          <div><label className="font-bold text-sm">ADDRESS:</label><input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputStyle} /></div>
          <div><label className="font-bold text-sm">SEX:</label><input type="text" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })} className={inputStyle} /></div>
        </div>

        <div className="text-6xl font-serif mt-10 mb-4">℞</div>

        <div className="space-y-4">
          {formData.medications.map((med, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded border border-gray-200">
              <div className="col-span-2"><label className="text-xs text-gray-500">Medication</label><input type="text" placeholder="e.g. Amoxicillin 500mg" value={med.name} onChange={e => handleMedChange(i, 'name', e.target.value)} className={inputStyle} /></div>
              <div><label className="text-xs text-gray-500">Sig (Freq)</label><input type="text" placeholder="e.g. 1x a day" value={med.frequency} onChange={e => handleMedChange(i, 'frequency', e.target.value)} className={inputStyle} /></div>
              <div><label className="text-xs text-gray-500">Duration</label><input type="text" placeholder="e.g. 7 days" value={med.duration} onChange={e => handleMedChange(i, 'duration', e.target.value)} className={inputStyle} /></div>
              <div><label className="text-xs text-gray-500">Qty</label><input type="text" placeholder="#21" value={med.quantity} onChange={e => handleMedChange(i, 'quantity', e.target.value)} className={inputStyle} /></div>
            </div>
          ))}
          {role === 'doctor' && <button type="button" onClick={handleAddMed} className="text-blue-600 text-sm font-bold">+ Add Another Medication</button>}
        </div>

        <div className="flex justify-end mt-16">
          <div className="w-72">
            <div className="border border-gray-300 bg-gray-50 rounded-lg overflow-hidden relative">
              {role === 'doctor' && <div className="absolute top-2 left-2 text-xs text-gray-400 pointer-events-none">Sign Here</div>}
              <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{ className: 'w-full h-32' }} />
            </div>
            {role === 'doctor' && <button type="button" onClick={() => sigCanvas.current?.clear()} className="text-xs text-gray-500 mt-1">Clear Signature</button>}
            
            <div className="mt-4 space-y-2">
              <div className="flex"><label className="text-sm w-16">Lic. No:</label><input type="text" value={formData.licNo} onChange={e => setFormData({...formData, licNo: e.target.value})} className={inputStyle} /></div>
              <div className="flex"><label className="text-sm w-16">PTR. No:</label><input type="text" value={formData.ptrNo} onChange={e => setFormData({...formData, ptrNo: e.target.value})} className={inputStyle} /></div>
            </div>
          </div>
        </div>

        {role === 'doctor' && <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 rounded hover:bg-blue-800">Authorize & Save Prescription</button>}
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><EPrescription /></React.StrictMode>);