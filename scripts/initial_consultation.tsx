import React, { useState } from 'react';
import { supabase } from '../shared/supabase';
import ReactDOM from 'react-dom/client';

// --- Types ---
export interface InitialConsultationData {
  // General Info
  dateOfConsultation: string;
  consultationTime: string;
  referredBy: string;
  modeOfTransaction: string;
  modeOfTransfer: string;
  
  // Clinical Notes
  chiefComplaints: string;
  diagnosis: string;
  historyOfPresentIllness: string;

  // Physical Exam & Vitals
  bp: string;
  hr: string;
  rr: string;
  temp: string;
  weight: string;
  height: string;
  o2Sat: string;
  muac: string;
  nutritionalStatus: string;
  bmi: string;
  visualAcuityLeft: string;
  visualAcuityRight: string;
  bloodType: string;
  generalSurvey: string;

  // Histories
  familyHistory: string;
  smoking: string;
  smokingSticksPerDay: string;
  smokingYears: string;
  drinking: string;
  drinkingFrequency: string;
  drinkingYears: string;
  immunizationHistory: string;

  // OBGyne History
  menarche: string;
  onsetSexualIntercourse: string;
  menopause: string;
  menopauseAge: string;
  lmp: string;
  intervalCycle: string;
  periodDuration: string;
  padsPerDay: string;
  birthControlMethod: string;

  // Pregnancy History
  gravidity: string;
  parity: string;
  typeOfDelivery: string;
  fullTerm: string;
  premature: string;
  abortion: string;
  livingChildren: string;
  preEclampsia: string;

  // Clinical Assessment
  medicationAndTreatment: string;
}

const EMPTY_FORM: InitialConsultationData = {
  dateOfConsultation: '', consultationTime: '', referredBy: '', modeOfTransaction: '', modeOfTransfer: '',
  chiefComplaints: '', diagnosis: '', historyOfPresentIllness: '',
  bp: '', hr: '', rr: '', temp: '', weight: '', height: '', o2Sat: '', muac: '', nutritionalStatus: '', bmi: '', visualAcuityLeft: '', visualAcuityRight: '', bloodType: '', generalSurvey: '',
  familyHistory: '', smoking: '', smokingSticksPerDay: '', smokingYears: '', drinking: '', drinkingFrequency: '', drinkingYears: '', immunizationHistory: '',
  menarche: '', onsetSexualIntercourse: '', menopause: '', menopauseAge: '', lmp: '', intervalCycle: '', periodDuration: '', padsPerDay: '', birthControlMethod: '',
  gravidity: '', parity: '', typeOfDelivery: '', fullTerm: '', premature: '', abortion: '', livingChildren: '', preEclampsia: '',
  medicationAndTreatment: ''
};

// --- Component ---
function InitialConsultation() {
  const [formData, setFormData] = useState<InitialConsultationData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

// 1. Helper function to safely convert empty text to NULL or numbers for your bigint/double columns
const toNumberOrNull = (val: string) => {
  if (!val || val.trim() === '') return null;
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
};

// 2. The Updated Submit Handler
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  // NOTE: Your database uses 'bigint' for patient_id, so this must be a number!
  const patientId = 1; // REPLACE_WITH_ACTUAL_PATIENT_ID_FROM_PROPS 

  try {
    // --- 1. INSERT INTO initial_consultation ---
    const { error: error1 } = await supabase
      .from('initial_consultation')
      .insert([{
        patient_id: patientId,
        consultation_date: formData.dateOfConsultation || null,
        consultation_time: formData.consultationTime || null,
        mode_of_transaction: formData.modeOfTransaction || null,
        referred_by: formData.referredBy || null,
        mode_of_transfer: formData.modeOfTransfer || null,
        chief_complaint: formData.chiefComplaints || null,
        diagnosis: formData.diagnosis || null
      }]);
    if (error1) throw new Error('Failed saving initial_consultation: ' + error1.message);

    // --- 2. INSERT INTO consultation ---
    const { error: error2 } = await supabase
      .from('consultation')
      .insert([{
        patient_id: patientId,
        family_history: formData.familyHistory || null,
        smoking_status: formData.smoking || null,
        smoking_sticks_per_day: toNumberOrNull(formData.smokingSticksPerDay),
        smoking_years: toNumberOrNull(formData.smokingYears),
        drinking_status: formData.drinking || null,
        drinking_frequency: formData.drinkingFrequency || null,
        drinking_years: toNumberOrNull(formData.drinkingYears),
        immunization_history: formData.immunizationHistory || null,
        menarche_age: toNumberOrNull(formData.menarche),
        sexual_onset_age: toNumberOrNull(formData.onsetSexualIntercourse),
        is_menopause: formData.menopause || null,
        menopause_age: toNumberOrNull(formData.menopauseAge),
        lmp: formData.lmp || null,
        interval_cycle: formData.intervalCycle || null,
        period_duration: formData.periodDuration || null,
        pads_per_day: toNumberOrNull(formData.padsPerDay),
        birth_control_method: formData.birthControlMethod || null,
        gravidity: toNumberOrNull(formData.gravidity),
        parity: toNumberOrNull(formData.parity),
        delivery_type: formData.typeOfDelivery || null,
        full_term_count: toNumberOrNull(formData.fullTerm),
        premature_count: toNumberOrNull(formData.premature),
        abortion_count: toNumberOrNull(formData.abortion),
        living_children_count: toNumberOrNull(formData.livingChildren),
        pre_eclampsia: formData.preEclampsia || null,
        medication_treatment: formData.medicationAndTreatment || null,
        past_med_surge_history: formData.historyOfPresentIllness || null // Mapped here
      }]);
    if (error2) throw new Error('Failed saving consultation: ' + error2.message);

    // --- 3. INSERT INTO vital_sign ---
    const { error: error3 } = await supabase
      .from('vital_sign')
      .insert([{
        patient_id: patientId,
        bp: formData.bp || null,
        heart_rate: toNumberOrNull(formData.hr),
        respiratory_rate: toNumberOrNull(formData.rr),
        temperature: toNumberOrNull(formData.temp),
        o2_saturation: toNumberOrNull(formData.o2Sat),
        weight: toNumberOrNull(formData.weight),
        height: toNumberOrNull(formData.height),
        muac: toNumberOrNull(formData.muac),
        nutritional_status: formData.nutritionalStatus || null,
        bmi: toNumberOrNull(formData.bmi),
        visual_acuity_left: formData.visualAcuityLeft || null,
        visual_acuity_right: formData.visualAcuityRight || null,
        general_survey: formData.generalSurvey || null
      }]);
    if (error3) throw new Error('Failed saving vital_sign: ' + error3.message);

    // If it makes it here without throwing an error, all 3 tables saved perfectly!
    alert('Consultation Record Saved successfully!');

    // If it makes it here without throwing an error, all 3 tables saved perfectly!
    alert('Consultation Record Saved successfully!');
    
    // ADD THIS LINE HERE:
    setFormData(EMPTY_FORM); 
    
  } catch (error: any) {
    console.error('Error saving consultation:', error);
    alert('Failed to save record: ' + error.message);
  } finally {
    setIsSubmitting(false);
  }
};

  // Helper for input styling
  const inputStyle = "w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none";
  const labelStyle = "block text-sm font-medium text-gray-700 mb-1";
  const sectionStyle = "bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6";

  return (
    <div className="max-w-5xl mx-auto p-4">
      
      {/* --- NEW BACK BUTTON SECTION --- */}
      <div className="flex justify-between items-center mb-6">
        <button 
          type="button" 
          onClick={() => window.history.back()} 
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow focus:outline-none transition-colors"
        >
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800 m-0">Initial Consultation Form</h2>
        <div style={{ width: '80px' }}></div> {/* Spacer to keep title centered */}
      </div>
      {/* ------------------------------- */}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION: General Information */}
        <fieldset className={sectionStyle}>
          <legend className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 w-full">General Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Date of Consultation</label>
              <input type="date" name="dateOfConsultation" value={formData.dateOfConsultation} onChange={handleChange} className={inputStyle} required />
            </div>
            <div>
              <label className={labelStyle}>Consultation Time</label>
              <input type="time" name="consultationTime" value={formData.consultationTime} onChange={handleChange} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Referred from/by</label>
              <input type="text" name="referredBy" value={formData.referredBy} onChange={handleChange} className={inputStyle} placeholder="Name or Department" />
            </div>
            
            <div className="md:col-span-1">
              <label className={labelStyle}>Mode of Transaction</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="modeOfTransaction" value="Walk in" onChange={handleRadioChange} checked={formData.modeOfTransaction === 'Walk in'} /> Walk in</label>
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="modeOfTransaction" value="Referral" onChange={handleRadioChange} checked={formData.modeOfTransaction === 'Referral'} /> Referral</label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelStyle}>Mode of Transfer</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="modeOfTransfer" value="Ambulatory" onChange={handleRadioChange} checked={formData.modeOfTransfer === 'Ambulatory'} /> Ambulatory</label>
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="modeOfTransfer" value="Via Wheelchair" onChange={handleRadioChange} checked={formData.modeOfTransfer === 'Via Wheelchair'} /> Via Wheelchair</label>
              </div>
            </div>
          </div>
        </fieldset>

        {/* SECTION: Chief Complaints & Illness History */}
        <fieldset className={sectionStyle}>
          <legend className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 w-full">Clinical Notes</legend>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelStyle}>Chief Complaints</label>
              <textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} rows={3} className={inputStyle} placeholder="Patient's primary symptoms..."></textarea>
            </div>
            <div>
              <label className={labelStyle}>Diagnosis</label>
              <textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} rows={2} className={inputStyle}></textarea>
            </div>
            <div>
              <label className={labelStyle}>History of Present Illnesses</label>
              <textarea name="historyOfPresentIllness" value={formData.historyOfPresentIllness} onChange={handleChange} rows={3} className={inputStyle}></textarea>
            </div>
          </div>
        </fieldset>

        {/* SECTION: Physical Examination & Vitals */}
        <fieldset className={sectionStyle}>
          <legend className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 w-full">Physical Examination & Vital Signs</legend>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div><label className={labelStyle}>BP (mmHg)</label><input type="text" name="bp" value={formData.bp} onChange={handleChange} className={inputStyle} placeholder="120/80" /></div>
            <div><label className={labelStyle}>Heart Rate (bpm)</label><input type="number" name="hr" value={formData.hr} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>Resp. Rate (cpm)</label><input type="number" name="rr" value={formData.rr} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>Temp (°C)</label><input type="number" step="0.1" name="temp" value={formData.temp} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>O2 Sat (%)</label><input type="number" name="o2Sat" value={formData.o2Sat} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>Weight (kg)</label><input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>Height (cm)</label><input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>BMI</label><input type="text" name="bmi" value={formData.bmi} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>MUAC</label><input type="text" name="muac" value={formData.muac} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>Nutritional Status</label><input type="text" name="nutritionalStatus" value={formData.nutritionalStatus} onChange={handleChange} className={inputStyle} /></div>
            <div><label className={labelStyle}>Visual Acuity (L)</label><input type="text" name="visualAcuityLeft" value={formData.visualAcuityLeft} onChange={handleChange} className={inputStyle} placeholder="20/20" /></div>
            <div><label className={labelStyle}>Visual Acuity (R)</label><input type="text" name="visualAcuityRight" value={formData.visualAcuityRight} onChange={handleChange} className={inputStyle} placeholder="20/20" /></div>
            <div><label className={labelStyle}>Blood Type</label><input type="text" name="bloodType" value={formData.bloodType} onChange={handleChange} className={inputStyle} placeholder="O+" /></div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className={labelStyle}>General Survey</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-1 text-sm"><input type="radio" name="generalSurvey" value="Awake and Alert" onChange={handleRadioChange} checked={formData.generalSurvey === 'Awake and Alert'} /> Awake and Alert</label>
              <label className="flex items-center gap-1 text-sm"><input type="radio" name="generalSurvey" value="Altered Sensorium" onChange={handleRadioChange} checked={formData.generalSurvey === 'Altered Sensorium'} /> Altered Sensorium</label>
            </div>
          </div>
        </fieldset>

        {/* SECTION: Social & Family History */}
        <fieldset className={sectionStyle}>
          <legend className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 w-full">Histories</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <div>
                  <label className={labelStyle}>Family History</label>
                  <textarea name="familyHistory" value={formData.familyHistory} onChange={handleChange} rows={2} className={inputStyle}></textarea>
               </div>
               <div>
                  <label className={labelStyle}>Immunization History</label>
                  <textarea name="immunizationHistory" value={formData.immunizationHistory} onChange={handleChange} rows={2} className={inputStyle}></textarea>
               </div>
            </div>
            
            <div className="space-y-4 bg-gray-50 p-4 rounded-md border border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Smoking History</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="flex items-center gap-1 text-sm"><input type="radio" name="smoking" value="Yes" onChange={handleRadioChange} checked={formData.smoking === 'Yes'} /> Yes</label>
                    <label className="flex items-center gap-1 text-sm"><input type="radio" name="smoking" value="No" onChange={handleRadioChange} checked={formData.smoking === 'No'} /> No</label>
                    {formData.smoking === 'Yes' && (
                        <>
                          <input type="number" name="smokingSticksPerDay" value={formData.smokingSticksPerDay} onChange={handleChange} className={`${inputStyle} w-24 py-1`} placeholder="Sticks/day" />
                          <input type="number" name="smokingYears" value={formData.smokingYears} onChange={handleChange} className={`${inputStyle} w-24 py-1`} placeholder="Years" />
                        </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 mt-4">Drinking History</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="flex items-center gap-1 text-sm"><input type="radio" name="drinking" value="Yes" onChange={handleRadioChange} checked={formData.drinking === 'Yes'} /> Yes</label>
                    <label className="flex items-center gap-1 text-sm"><input type="radio" name="drinking" value="No" onChange={handleRadioChange} checked={formData.drinking === 'No'} /> No</label>
                    {formData.drinking === 'Yes' && (
                        <>
                          <input type="text" name="drinkingFrequency" value={formData.drinkingFrequency} onChange={handleChange} className={`${inputStyle} w-32 py-1`} placeholder="Frequency" />
                          <input type="number" name="drinkingYears" value={formData.drinkingYears} onChange={handleChange} className={`${inputStyle} w-24 py-1`} placeholder="Years" />
                        </>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </fieldset>

        {/* SECTION: OBGyne & Pregnancy History */}
        <fieldset className={sectionStyle}>
          <legend className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 w-full">OBGyne & Pregnancy History</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* OBGyne Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">OBGyne</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelStyle}>Menarche (y/o)</label><input type="number" name="menarche" value={formData.menarche} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Onset Sexual Intercourse (y/o)</label><input type="number" name="onsetSexualIntercourse" value={formData.onsetSexualIntercourse} onChange={handleChange} className={inputStyle} /></div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className={labelStyle + " mb-0"}>Menopause:</label>
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="menopause" value="Yes" onChange={handleRadioChange} checked={formData.menopause === 'Yes'} /> Yes</label>
                <label className="flex items-center gap-1 text-sm"><input type="radio" name="menopause" value="No" onChange={handleRadioChange} checked={formData.menopause === 'No'} /> No</label>
                {formData.menopause === 'Yes' && (
                  <input type="number" name="menopauseAge" value={formData.menopauseAge} onChange={handleChange} className={`${inputStyle} w-24 py-1 ml-2`} placeholder="Age" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelStyle}>LMP</label><input type="date" name="lmp" value={formData.lmp} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Interval Cycle (Days)</label><input type="text" name="intervalCycle" value={formData.intervalCycle} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Period Duration (Days)</label><input type="text" name="periodDuration" value={formData.periodDuration} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}># of pads/day</label><input type="number" name="padsPerDay" value={formData.padsPerDay} onChange={handleChange} className={inputStyle} /></div>
              </div>
              <div><label className={labelStyle}>Birth Control Method</label><input type="text" name="birthControlMethod" value={formData.birthControlMethod} onChange={handleChange} className={inputStyle} /></div>
            </div>

            {/* Pregnancy Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Pregnancy History</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelStyle}>Gravidity</label><input type="number" name="gravidity" value={formData.gravidity} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Parity</label><input type="number" name="parity" value={formData.parity} onChange={handleChange} className={inputStyle} /></div>
                
                <div className="col-span-2">
                  <label className={labelStyle}>Type of Delivery</label>
                  <select name="typeOfDelivery" value={formData.typeOfDelivery} onChange={handleChange} className={inputStyle}>
                    <option value="">Select type...</option>
                    <option value="Normal">Normal</option>
                    <option value="CS">CS</option>
                    <option value="Both">Both Normal and CS</option>
                  </select>
                </div>

                <div><label className={labelStyle}># of Full Term</label><input type="number" name="fullTerm" value={formData.fullTerm} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}># of Premature</label><input type="number" name="premature" value={formData.premature} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}># of Abortion</label><input type="number" name="abortion" value={formData.abortion} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}># of Living Children</label><input type="number" name="livingChildren" value={formData.livingChildren} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-2">
                  <label className={labelStyle}>Pre-eclampsia</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 text-sm"><input type="radio" name="preEclampsia" value="Yes" onChange={handleRadioChange} checked={formData.preEclampsia === 'Yes'} /> Yes</label>
                    <label className="flex items-center gap-1 text-sm"><input type="radio" name="preEclampsia" value="No" onChange={handleRadioChange} checked={formData.preEclampsia === 'No'} /> No</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* SECTION: Clinical Assessment */}
        <fieldset className={sectionStyle}>
          <legend className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 w-full">Clinical Assessment</legend>
          <div>
            <label className={labelStyle}>Medication and Treatment</label>
            <textarea name="medicationAndTreatment" value={formData.medicationAndTreatment} onChange={handleChange} rows={5} className={inputStyle} placeholder="Prescribed medications, treatment plans, follow-up instructions..."></textarea>
          </div>
        </fieldset>

        {/* Submit Button */}
        <div className="flex justify-end mt-8">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving Record...' : 'Save Consultation Record'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default InitialConsultation;

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <InitialConsultation />
  </React.StrictMode>
);