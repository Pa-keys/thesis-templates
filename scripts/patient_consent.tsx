import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ConsentProps {
    patientId: string;
    patientName: string;
    onConsentSaved: () => void;
}

export default function PatientConsent({ patientId, patientName, onConsentSaved }: ConsentProps) {
    const [rhuPersonnel, setRhuPersonnel] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // We now have two separate references for the two signature pads
    const patientSigCanvas = useRef<SignatureCanvas>(null);
    const personnelSigCanvas = useRef<SignatureCanvas>(null);

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
            // Extract both images
            const patientSignatureDataUrl = patientSigCanvas.current?.getCanvas().toDataURL('image/png');
            const personnelSignatureDataUrl = personnelSigCanvas.current?.getCanvas().toDataURL('image/png');

            console.log("Sending data to Supabase..."); // Helpful for debugging!

            const { data, error } = await supabase
                .from('patients') 
                .update({ 
                    consent_signed: true,
                    consent_signature: patientSignatureDataUrl,
                    consent_personnel: rhuPersonnel,
                    consent_personnel_signature: personnelSignatureDataUrl,
                    consent_date: new Date().toISOString()
                })
                .eq('id', patientId)
                .select(); // Added .select() to force Supabase to return the updated row

            console.log("Supabase response:", { data, error });

            if (error) {
                alert("Database Error: " + error.message);
            } else if (!data || data.length === 0) {
                alert("Update blocked! This is likely due to Row Level Security (RLS) policies in Supabase.");
            } else {
                alert("Consent successfully recorded!");
                onConsentSaved(); 
            }

        } catch (err: any) {
            console.error("Critical System Error:", err);
            alert("A critical error occurred: " + err.message);
        } finally {
            // CRITICAL FIX: This guarantees the button will always un-freeze, no matter what happens
            setIsSubmitting(false);
        }
    };

    const clearPatientSignature = () => patientSigCanvas.current?.clear();
    const clearPersonnelSignature = () => personnelSigCanvas.current?.clear();

    return (
        <form onSubmit={handleSubmit} className="form-container" style={{ marginTop: '20px', borderTop: '4px solid #2c3e50' }}>
            <h3 style={{ marginBottom: '5px' }}>Patient Consent</h3>
            <hr style={{ marginBottom: '15px' }} />

            <div style={{ marginBottom: '25px', fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.6' }}>
                <p>I hereby give my consent to the Malvar Rural Health Unit to collect, process, and store my personal and medical information for the purpose of healthcare delivery, diagnosis, treatment, and referral. I understand that my records will be kept confidential in accordance with the Data Privacy Act of 2012. I certify that the information provided is true and correct to the best of my knowledge.</p>
            </div>

            {/* Patient Signature Section */}
            <div style={{ marginBottom: '25px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568', display: 'block', marginBottom: '8px' }}>
                    Patient Signature
                </label>
                <div style={{ border: '2px dashed #cbd5e0', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                    <SignatureCanvas 
                        ref={patientSigCanvas} 
                        penColor="black"
                        canvasProps={{width: 500, height: 180, className: 'sigCanvas'}} 
                    />
                </div>
                <button type="button" onClick={clearPatientSignature} style={{ marginTop: '10px', padding: '8px', border: 'none', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#4a5568', cursor: 'pointer' }}>Clear Patient Signature</button>
            </div>

            {/* NEW: RHU Personnel Signature Section */}
            <div style={{ marginBottom: '25px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568', display: 'block', marginBottom: '8px' }}>
                    RHU Personnel Signature
                </label>
                <div style={{ border: '2px dashed #cbd5e0', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                    <SignatureCanvas 
                        ref={personnelSigCanvas} 
                        penColor="#2b6cb0" // Giving the staff a blue pen color to distinguish it!
                        canvasProps={{width: 500, height: 180, className: 'sigCanvas'}} 
                    />
                </div>
                <button type="button" onClick={clearPersonnelSignature} style={{ marginTop: '10px', padding: '8px', border: 'none', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#4a5568', cursor: 'pointer' }}>Clear Personnel Signature</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Patient Name</label>
                    <input type="text" value={patientName} disabled style={{ backgroundColor: '#edf2f7' }} />
                </div>
                
                <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>RHU Personnel (Printed Name)</label>
                    <input type="text" placeholder="Print Name" value={rhuPersonnel} onChange={e => setRhuPersonnel(e.target.value)} required />
                </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ marginTop: '20px', width: '100%', padding: '12px', border: 'none', borderRadius: '5px', backgroundColor: '#38a169', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                {isSubmitting ? 'Saving...' : 'Confirm Consent'}
            </button>
        </form>
    );
}