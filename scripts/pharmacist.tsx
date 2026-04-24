import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../shared/supabase';
import { requireRole } from '../shared/auth';
import { Sidebar } from './sidebar';

// --- Interfaces ---
interface Patient {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    age: number | null;
    sex: string;
    address?: string; // Added to match print format
}

interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: string;
}

interface Prescription {
    prescription_id: number;
    consultation_id: number | null;
    patient_id: number;
    prescription_date: string;
    rx_content: string;
    doctor_name: string | null;
    license_no: number | null;
    ptr_no: string | null;
    status: string;
    dispensed_at: string | null;
    signature_url: string | null;
    patients: Patient;
}

function PharmacyDashboard() {
    const [profile, setProfile] = useState<any>(null);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
    const [dispenseChecklist, setDispenseChecklist] = useState<Record<number, boolean>>({});
    const [isDispensing, setIsDispensing] = useState(false);

    // Sidebar & Layout State
    const [activePage, setActivePage] = useState('queue');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const pharmacistNavItems = [
        { id: 'queue', label: 'Pending Queue', icon: '💊' }
    ];

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Authenticate and load profile
        requireRole('pharmacist').then(p => setProfile(p));
        loadPrescriptions();

        // Real-time Subscription
        const channel = supabase
            .channel('pharmacist-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prescription' }, () => loadPrescriptions())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'prescription' }, () => loadPrescriptions())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const loadPrescriptions = async () => {
        const { data, error } = await supabase
            .from('prescription')
            // Included address to ensure the printout has full data
            .select(`*, patients (id, firstName, middleName, lastName, age, sex, address)`)
            .eq('status', 'Pending')
            .order('prescription_id', { ascending: false });

        if (!error && data) {
            setPrescriptions(data as unknown as Prescription[]);
        }
    };

    const handleRxSelect = (rx: Prescription) => {
        setSelectedRx(rx);
        const meds = JSON.parse(rx.rx_content || '[]');
        const initialChecklist: Record<number, boolean> = {};
        meds.forEach((_: any, i: number) => { initialChecklist[i] = true; });
        setDispenseChecklist(initialChecklist);
    };

    const handleToggleChecklist = (index: number) => {
        setDispenseChecklist(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // ─── Updated Print Format (Matches doctor.tsx) ───────────────────────────
    const handlePrintUnavailable = () => {
        if (!selectedRx) return;
        
        const meds = JSON.parse(selectedRx.rx_content || '[]');
        const unavailableMeds = meds.filter((_: any, i: number) => !dispenseChecklist[i]);

        if (unavailableMeds.length === 0) {
            alert("All medications are checked. There are no unavailable medications to print.");
            return;
        }

        const patientFullName = `${selectedRx.patients.lastName}, ${selectedRx.patients.firstName} ${selectedRx.patients.middleName || ''}`.trim();
        const pt = selectedRx.patients;

        const html = `
            <!DOCTYPE html><html><head>
            <title>Unavailable Medications - ${patientFullName}</title>
            <style>
                @page { size: A5 portrait; margin: 10mm; }
                body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2; padding: 10px 15px; margin: 0; }
                .header { text-align: center; margin-bottom: 12px; }
                .header p { margin: 2px 0; font-size: 13px; }
                .header h3 { margin: 5px 0 0 0; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; }
                .divider { border-bottom: 1.5px solid #000; margin: 12px 0; }
                .patient-info { font-size: 14px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 5px; }
                .row { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; }
                .field { display: flex; align-items: flex-end; }
                .field span { margin-right: 5px; white-space: nowrap; }
                .value { border-bottom: 1px solid #000; flex-grow: 1; padding: 0 5px; text-align: center; font-weight: bold; }
                .rx-symbol { font-size: 48px; font-weight: bold; margin: 15px 0 5px 10px; line-height: 1; font-style: italic; }
                .med-list { min-height: 280px; padding: 0 20px 0 45px; }
                .med-item { margin-bottom: 15px; font-size: 14px; }
                .med-name { font-weight: bold; font-size: 15px; margin-bottom: 3px; }
                .med-sig { margin-left: 20px; }
                .footer { display: flex; justify-content: space-between; align-items: flex-end; font-size: 13px; page-break-inside: avoid; }
                .next-visit { display: flex; align-items: flex-end; }
                .doctor-block { text-align: center; width: 220px; }
                .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px; }
                .doc-name { font-weight: bold; font-size: 15px; text-transform: uppercase; }
                .doc-creds { font-size: 12px; display: flex; flex-direction: column; align-items: center; margin-top: 3px; }
                .note { margin-top: 20px; font-style: italic; font-size: 11px; color: #555; text-align: center; }
            </style></head><body>
                <div class="header">
                    <p>Republic of the Philippines</p><p>Province of Batangas</p><p>Municipality of Malvar</p>
                    <h3>MUNICIPAL HEALTH OFFICE</h3>
                </div>
                <div class="divider"></div>
                <div class="patient-info">
                    <div class="row">
                        <div class="field" style="width:68%;"><span>Name:</span><div class="value" style="text-align:left;">${patientFullName}</div></div>
                        <div class="field" style="width:30%;"><span>Date:</span><div class="value">${new Date().toLocaleDateString('en-US')}</div></div>
                    </div>
                    <div class="row">
                        <div class="field" style="width:18%;"><span>Age:</span><div class="value">${pt.age || '&nbsp;'}</div></div>
                        <div class="field" style="width:18%;"><span>Sex:</span><div class="value">${pt.sex || '&nbsp;'}</div></div>
                        <div class="field" style="width:60%;"><span>Address:</span><div class="value" style="text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pt.address ? pt.address.split(',')[0] : '&nbsp;'}</div></div>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="rx-symbol">&#8478;</div>
                <div class="med-list">
                    ${unavailableMeds.map((m: Medication) => `<div class="med-item"><div class="med-name">${m.quantity ? `${m.quantity} ` : ''}${m.name}</div><div class="med-sig">Sig: ${m.dosage} ${m.frequency || ''} ${m.duration ? `for ${m.duration}` : ''}</div></div>`).join('')}
                </div>
                <div class="footer">
                    <div class="next-visit"><span>Status:</span><div class="value" style="width:100px; font-size:10px;">Not Dispensed at RHU</div></div>
                    <div class="doctor-block"><div class="sig-line"></div><div class="doc-name">${selectedRx.doctor_name || 'MD'}, MD</div>
                    <div class="doc-creds"><span>Lic No: ${selectedRx.license_no || '________________'}</span><span>PTR No: ${selectedRx.ptr_no || '________________'}</span></div></div>
                </div>
                <div class="note">* Note: The medications listed above were unavailable at the RHU pharmacy during dispensing.</div>
            </body></html>`;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) return;
        iframeDoc.open(); iframeDoc.write(html); iframeDoc.close();
        setTimeout(() => {
            iframe.contentWindow?.focus(); iframe.contentWindow?.print();
            setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
        }, 500);
    };

    const handleDispense = async () => {
        if (!selectedRx) return;
        setIsDispensing(true);

        const { error } = await supabase
            .from('prescription')
            .update({
                status: 'Dispensed',
                dispensed_at: new Date().toISOString()
            })
            .eq('prescription_id', selectedRx.prescription_id);

        setIsDispensing(false);
        if (!error) {
            setSelectedRx(null);
            setPrescriptions(prev => prev.filter(p => p.prescription_id !== selectedRx.prescription_id));
        } else {
            alert('Error dispensing: ' + error.message);
        }
    };

    const filteredRx = prescriptions.filter(rx => {
        const pt = rx.patients;
        if (!pt) return false;
        const fullName = `${pt.firstName} ${pt.middleName} ${pt.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const initials = profile?.fullName 
        ? profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) 
        : 'P';

    const medsToDispense = selectedRx ? JSON.parse(selectedRx.rx_content || '[]') : [];
    const allChecked = medsToDispense.length > 0 && medsToDispense.every((_: any, i: number) => dispenseChecklist[i]);

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden w-full">
            
            <Sidebar 
                activePage={activePage}
                userName={profile?.fullName || 'Loading...'}
                userInitials={initials}
                userRole="Pharmacist"
                navItems={pharmacistNavItems}
                onNavigate={(id) => setActivePage(id)}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isOnline={isOnline}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-[240px] w-full">
                
                <header className="h-[60px] md:h-[72px] w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2 -ml-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <div className="font-bold text-lg text-slate-800 capitalize">Pharmacy Dashboard</div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-full`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900 leading-tight">{profile?.fullName || 'Loading...'}</div>
                            <div className="text-[0.7rem] text-slate-500 font-medium">Pharmacist</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md cursor-pointer">
                            {initials}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#F8FAFC]">
                    <div className="w-full max-w-full p-4 md:p-6 lg:p-8 mx-auto flex flex-col gap-6">
                        {activePage === 'queue' && (
                            <>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Prescription Queue 💊</h1>
                                        <p className="text-sm text-slate-500 mt-1">Review e-prescriptions sent by doctors and dispense medications.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">⏳</div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Awaiting Dispense</div>
                                                <div className="text-2xl font-black text-slate-900 leading-tight">{prescriptions.length}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm w-full">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                        <div>
                                            <h3 className="font-bold text-slate-900">Pending Prescriptions</h3>
                                            <p className="text-xs text-slate-500">Click to review medication details.</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-auto">
                                            <span>🔍</span>
                                            <input 
                                                type="text" 
                                                placeholder="Search patient..." 
                                                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {filteredRx.length === 0 ? (
                                            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                                                No pending prescriptions found.
                                            </div>
                                        ) : (
                                            filteredRx.map(rx => (
                                                <div key={rx.prescription_id} onClick={() => handleRxSelect(rx)} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                                                            {rx.patients?.firstName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900">{rx.patients?.lastName}, {rx.patients?.firstName}</h4>
                                                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                                <span className="flex items-center gap-1">👤 {rx.patients?.sex}</span>
                                                                <span className="flex items-center gap-1">👨‍⚕️ {rx.doctor_name || 'Unknown Doctor'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                                        <span className="text-xs font-medium text-slate-500">{new Date(rx.prescription_date).toLocaleDateString('en-PH')}</span>
                                                        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[0.65rem] font-bold uppercase tracking-wide">⏳ Pending</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {selectedRx && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 md:p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">E-Prescription Details</h2>
                                <p className="text-sm text-slate-500 mt-1">Patient: <span className="font-semibold text-slate-700">{selectedRx.patients?.firstName} {selectedRx.patients?.lastName}</span></p>
                            </div>
                            <button onClick={() => setSelectedRx(null)} className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center transition-colors">✕</button>
                        </div>
                        
                        <div className="p-5 md:p-6 overflow-y-auto">
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prescribed Medications</h3>
                                <span className="text-xs text-slate-400 italic">Check the box if medication is dispensed</span>
                            </div>
                            
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <tr>
                                                <th className="p-4 font-semibold text-center">Dispense</th>
                                                <th className="p-4 font-semibold">Medication</th>
                                                <th className="p-4 font-semibold">Dosage</th>
                                                <th className="p-4 font-semibold">Frequency</th>
                                                <th className="p-4 font-semibold">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {medsToDispense.map((med: Medication, i: number) => (
                                                <tr key={i} className={`border-b border-slate-100 last:border-0 transition-colors ${dispenseChecklist[i] ? 'bg-white' : 'bg-red-50/50 opacity-60'}`}>
                                                    <td className="p-4 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-5 h-5 accent-blue-600 cursor-pointer" 
                                                            checked={!!dispenseChecklist[i]} 
                                                            onChange={() => handleToggleChecklist(i)}
                                                        />
                                                    </td>
                                                    <td className={`p-4 font-bold ${dispenseChecklist[i] ? 'text-blue-600' : 'text-red-700 line-through'}`}>{med.name}</td>
                                                    <td className="p-4 text-slate-700">{med.dosage}</td>
                                                    <td className="p-4 text-slate-700">{med.frequency}</td>
                                                    <td className="p-4 font-black text-slate-900">{med.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap sm:flex-nowrap justify-end gap-3 shrink-0">
                            <button onClick={() => setSelectedRx(null)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors w-full sm:w-auto">
                                Cancel
                            </button>
                            
                            <button 
                                onClick={handlePrintUnavailable}
                                disabled={allChecked}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-2 ${
                                    allChecked 
                                    ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-500 border border-slate-300' 
                                    : 'text-pink-700 bg-pink-100 border border-pink-200 hover:bg-pink-200 shadow-sm hover:shadow'
                                }`}
                            >
                                🖨️ Print Unavailable
                            </button>

                            <button 
                                onClick={handleDispense} 
                                disabled={isDispensing}
                                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                            >
                                {isDispensing ? 'Dispensing...' : '✅ Mark as Dispensed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<PharmacyDashboard />);
}