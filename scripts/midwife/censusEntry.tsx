import React, { useState, useMemo, useEffect } from 'react';
import { midwifeAPI } from './api';

interface Props {
    patients: any[];
    records: any[];
    onSaveSuccess: () => Promise<void>;
}

const CensusEntry = ({ patients, records, onSaveSuccess }: Props) => {
    const [activeLogbook, setActiveLogbook] = useState('maternal');
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [formData, setFormData] = useState<any>({});
    
    // Global UI Requirement states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const activeRecords = useMemo(() => {
        return records.filter(r => r.category === activeLogbook);
    }, [records, activeLogbook]);

    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return patients.filter(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            return fullName.includes(searchQuery.toLowerCase());
        });
    }, [patients, searchQuery]);

    // Handle generic inputs
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    // Auto-calculate BMI
    const calculatedBMI = useMemo(() => {
        if (formData.height && formData.weight) {
            const heightM = Number(formData.height) / 100;
            const bmi = Number(formData.weight) / (heightM * heightM);
            let status = 'Normal';
            if (bmi < 18.5) status = 'Underweight';
            else if (bmi >= 25 && bmi < 29.9) status = 'Overweight';
            else if (bmi >= 30) status = 'Obese';
            return { value: bmi.toFixed(1), status };
        }
        return null;
    }, [formData.height, formData.weight]);

    // Auto-calculate BCG Age
    const calculatedBCGAge = useMemo(() => {
        if (formData.bcg_date && selectedPatient?.birthday) {
            const dob = new Date(selectedPatient.birthday);
            const bcg = new Date(formData.bcg_date);
            const diffTime = Math.abs(bcg.getTime() - dob.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 28 ? "0 to 28 days old" : "29 days to 1 year old";
        }
        return null;
    }, [formData.bcg_date, selectedPatient]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) {
            setErrorMsg("Please select a patient from the registry first.");
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');
        
        // ─── COMPILE DATA WITH AUTO-CALCULATIONS BEFORE SAVING ───
        const payloadData = { ...formData };
        
        // Always save sex/age for easy reporting
        payloadData.patient_sex = selectedPatient.sex;
        payloadData.patient_age = selectedPatient.age;

        if (activeLogbook === 'maternal' && calculatedBMI) {
            payloadData.bmi_value = calculatedBMI.value;
            payloadData.bmi_status = calculatedBMI.status;
        }
        
        if (activeLogbook === 'child' && calculatedBCGAge) {
            payloadData.bcg_age_category = calculatedBCGAge;
        }

        if (activeLogbook === 'family_planning') {
            const age = Number(selectedPatient.age);
            payloadData.fp_age_bracket = age >= 10 && age <= 14 ? "10-14" : (age >= 15 && age <= 19 ? "15-19" : "20-49");
        }

        if (activeLogbook === 'dental' && formData.received_bohc) {
            const age = Number(selectedPatient.age);
            payloadData.dental_age_bracket = age >= 10 && age <= 14 ? "10-14" : (age >= 15 && age <= 19 ? "15-19" : (age >= 20 && age <= 59 ? "20-59" : "Other Ages"));
        }

        if (activeLogbook === 'ncd') {
            payloadData.is_senior_citizen = Number(selectedPatient.age) >= 60 ? "Yes" : "No";
        }

        try {
            await midwifeAPI.saveFHSISLog({
                patientId: selectedPatient.id,
                category: activeLogbook,
                data: payloadData
            });
            
            // Show Global UI Success Toast
            setShowSuccess(true);
            
            setTimeout(async () => {
                setShowSuccess(false);
                setFormData({}); 
                setSelectedPatient(null);
                setSearchQuery('');
                setIsAddingEntry(false);
                await onSaveSuccess(); 
            }, 2500);
            
        } catch (error: any) {
            console.error("FHSIS Save Error:", error);
            setErrorMsg(error.message || "Failed to save record to the database.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const logbooks = [
        { id: 'maternal', label: '🤰 Maternal Care' },
        { id: 'child', label: '👶 Child Care' },
        { id: 'family_planning', label: '💊 Family Planning' },
        { id: 'dental', label: '🦷 Dental Health' },
        { id: 'ncd', label: '🫀 NCD & Seniors' },
        { id: 'rabies_leprosy', label: '🐕 Rabies & Leprosy' }
    ];

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500 relative pb-10">
            
            {/* GLOBAL SUCCESS TOAST NOTIFICATION */}
            {showSuccess && (
                <div className="fixed top-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-right-8 fade-in">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">✓</div>
                    <div>
                        <p className="font-bold text-sm">Record Saved Successfully</p>
                        <p className="text-xs text-emerald-100">The database has been updated.</p>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Program Logbooks (FHSIS)</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-5">
                    {logbooks.map(log => (
                        <button 
                            key={log.id}
                            onClick={() => { 
                                setActiveLogbook(log.id); 
                                setIsAddingEntry(false);
                                setFormData({});
                                setSelectedPatient(null);
                            }}
                            className={`flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                activeLogbook === log.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {log.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}>
                {!isAddingEntry ? (
                    <div className="card shadow-sm border border-slate-200">
                        <div className="card-hd border-b border-slate-100 pb-4 mb-0 bg-slate-50/50 p-6 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{logbooks.find(l => l.id === activeLogbook)?.label} Registry</h3>
                            </div>
                            <button onClick={() => setIsAddingEntry(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700">
                                ➕ New Entry
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 pl-6 font-bold text-xs text-slate-500 uppercase">Date</th>
                                        <th className="p-4 font-bold text-xs text-slate-500 uppercase">Patient Name</th>
                                        <th className="p-4 font-bold text-xs text-slate-500 uppercase">Address</th>
                                        <th className="p-4 pr-6 font-bold text-xs text-slate-500 uppercase text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {activeRecords.length > 0 ? activeRecords.map(record => (
                                        <tr key={record.id} className="hover:bg-slate-50">
                                            <td className="p-4 pl-6 text-slate-600 font-medium">{new Date(record.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold text-slate-800 capitalize">{record.patientName}</td>
                                            <td className="p-4 capitalize text-slate-600">{record.address || 'No Address'}</td>
                                            <td className="p-4 pr-6 text-right"><span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold">Saved</span></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="p-12 text-center text-slate-400">No census entries found. Click 'New Entry' to start.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="card shadow-sm border border-slate-200 p-8 animate-in slide-in-from-right-8">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                            <button onClick={() => setIsAddingEntry(false)} className="px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">← Back</button>
                            <h3 className="text-xl font-extrabold text-slate-800">New {logbooks.find(l => l.id === activeLogbook)?.label} Entry</h3>
                        </div>

                        {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-semibold">⚠️ {errorMsg}</div>}

                        <div className="max-w-3xl">
                            {/* STEP 1: PATIENT SELECTION */}
                            <div className="mb-10">
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">1. Select Patient</label>
                                {!selectedPatient ? (
                                    <div className="relative">
                                        <input type="text" placeholder="Search patient name..." value={searchQuery} onFocus={() => setShowDropdown(true)} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                                        {showDropdown && searchQuery && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50">
                                                {filteredPatients.map(p => (
                                                    <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setShowDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-blue-50 border-b border-slate-50 flex justify-between">
                                                        <span className="font-bold text-slate-800 capitalize">{p.firstName} {p.lastName}</span>
                                                        <span className="text-[0.65rem] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase">{p.address}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-900 capitalize text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                            {/* READ-ONLY DISPLAY FOR ALL TABS */}
                                            <p className="text-xs font-semibold text-blue-600 mt-1 uppercase">
                                                Brgy. {selectedPatient.address} • Age: {selectedPatient.age || 'N/A'} • Sex: {selectedPatient.sex || 'N/A'} 
                                                {activeLogbook === 'child' && ` • DOB: ${selectedPatient.birthday}`}
                                            </p>
                                        </div>
                                        <button onClick={() => { setSelectedPatient(null); setSearchQuery(''); }} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-100">Change</button>
                                    </div>
                                )}
                            </div>

                            {/* STEP 2: DYNAMIC FORMS */}
                            <form onSubmit={handleSubmit} className={!selectedPatient ? 'opacity-40 pointer-events-none' : ''}>
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">2. Program Data Input</label>
                                
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
                                    
                                    {/* 1. MATERNAL CARE */}
                                    {activeLogbook === 'maternal' && (
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Prenatal Checkup Visit</label>
                                                <select name="prenatal_visit" onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                                    <option value="">Select Visit...</option>
                                                    <option value="1st Trimester">1st Trimester</option>
                                                    <option value="2nd Trimester">2nd Trimester</option>
                                                    <option value="3rd Trimester - Visit 1">3rd Trimester - Visit 1</option>
                                                    <option value="3rd Trimester - Visit 2">3rd Trimester - Visit 2</option>
                                                    <option value="Extra Visit">Extra Visit (More than 4)</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-white border border-slate-200 rounded-lg">
                                                <div className="col-span-2"><h4 className="text-sm font-bold text-slate-800">BMI Assessment</h4></div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Height (cm)</label>
                                                    <input type="number" name="height" onChange={handleInputChange} required className="w-full p-2 border border-slate-300 rounded-lg" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Weight (kg)</label>
                                                    <input type="number" name="weight" onChange={handleInputChange} required className="w-full p-2 border border-slate-300 rounded-lg" />
                                                </div>
                                                {calculatedBMI && (
                                                    <div className="col-span-2 mt-2 p-3 bg-blue-50 rounded-lg text-sm border border-blue-100 flex justify-between">
                                                        <span>Calculated BMI: <strong>{calculatedBMI.value}</strong></span>
                                                        <span>Status: <strong className={calculatedBMI.status === 'Normal' ? 'text-green-600' : 'text-amber-600'}>{calculatedBMI.status}</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. CHILD CARE */}
                                    {activeLogbook === 'child' && (
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Child Protected at Birth (CPAB)?</label>
                                                <select name="cpab" onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                                    <option value="">Select...</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Date of BCG Vaccination</label>
                                                <input type="date" name="bcg_date" onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                                                {calculatedBCGAge && (
                                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm border border-blue-100 font-semibold text-blue-800">
                                                        Auto-tagged Category: {calculatedBCGAge}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. FAMILY PLANNING */}
                                    {activeLogbook === 'family_planning' && (
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Method Used</label>
                                                <select name="fp_method" onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                                    <option value="">Select...</option>
                                                    <option value="BTL">BTL</option>
                                                    <option value="NSV">NSV</option>
                                                    <option value="Condom">Condom</option>
                                                    <option value="Pills">Pills</option>
                                                    <option value="IUD">IUD</option>
                                                    <option value="Injectables">Injectables</option>
                                                    <option value="Implant">Implant</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Client Status</label>
                                                <select name="fp_status" onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                                    <option value="">Select...</option>
                                                    <option value="Current User">Current User</option>
                                                    <option value="New Acceptor">New Acceptor</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. DENTAL HEALTH */}
                                    {activeLogbook === 'dental' && (
                                        <div>
                                            <label className="flex items-center gap-3 p-4 bg-white border border-slate-300 rounded-xl cursor-pointer">
                                                <input type="checkbox" name="received_bohc" onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                                                <span className="text-sm font-bold text-slate-800">Received Basic Oral Health Care (BOHC)</span>
                                            </label>
                                            {formData.received_bohc && selectedPatient && (
                                                <p className="text-xs text-emerald-600 mt-2 font-bold px-2">Patient auto-tagged to age bracket based on age {selectedPatient.age}.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* 5. NCD & SENIORS */}
                                    {activeLogbook === 'ncd' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                                                    <input type="checkbox" name="philpen" onChange={handleInputChange} />
                                                    <span className="text-sm font-medium">Risk-assessed (PhilPEN)</span>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                                                    <input type="checkbox" name="visual_acuity" onChange={handleInputChange} />
                                                    <span className="text-sm font-medium">Screened for Visual Acuity</span>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                                                    <input type="checkbox" name="ppv" onChange={handleInputChange} />
                                                    <span className="text-sm font-medium">Received PPV Dose</span>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                                                    <input type="checkbox" name="influenza" onChange={handleInputChange} />
                                                    <span className="text-sm font-medium">Received Influenza Dose</span>
                                                </label>
                                            </div>
                                            <div className="mt-4">
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Diagnosed with eye disease/s?</label>
                                                <select name="eye_disease" onChange={handleInputChange} className="w-full md:w-1/2 p-2.5 border border-slate-300 rounded-lg text-sm">
                                                    <option value="">Select...</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                            {selectedPatient?.age >= 60 && (
                                                <p className="text-xs text-emerald-600 font-bold px-2">Auto-tagged as Senior Citizen.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* 6. RABIES & LEPROSY */}
                                    {activeLogbook === 'rabies_leprosy' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                                                <h4 className="font-bold text-sm text-slate-800 mb-3 border-b pb-2">Leprosy Status</h4>
                                                <select name="leprosy_status" onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                                    <option value="None / N/A">None / N/A</option>
                                                    <option value="Newly Detected Case">Newly Detected Case</option>
                                                    <option value="On Treatment">On Treatment</option>
                                                </select>
                                            </div>
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                                                <h4 className="font-bold text-sm text-slate-800 mb-3 border-b pb-2">Rabies / Animal Bite</h4>
                                                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                                                    <input type="checkbox" name="animal_bite" onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded" />
                                                    <span className="text-sm font-medium">Patient had an animal bite</span>
                                                </label>
                                                {formData.animal_bite && (
                                                    <div>
                                                        <label className="block text-[0.65rem] font-bold text-slate-500 mb-1 uppercase">Outcome</label>
                                                        <select name="rabies_outcome" onChange={handleInputChange} required className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                                                            <option value="">Select Outcome...</option>
                                                            <option value="Alive/Recovered">Alive/Recovered</option>
                                                            <option value="Death due to Rabies">Death due to Rabies</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-end pt-4">
                                    <button type="submit" disabled={isSubmitting || !selectedPatient} className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                                        {isSubmitting ? <span className="animate-pulse">Saving Record...</span> : 'Save FHSIS Record'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CensusEntry;