import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../shared/supabase';
import { midwifeAPI } from './api';

export const useMidwifeData = () => {
    const [patients, setPatients] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        const currentMonth = new Date().toISOString().substring(0, 7);

        // 1. Fetch Patients with patient_consent joined so Dashboard can show consent status
        try {
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    id,
                    firstName,
                    lastName,
                    sex,
                    age,
                    created_at,
                    patient_consent ( consent_id )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients(data || []);
        } catch (err) {
            console.error("❌ Error fetching patients:", err);
            setPatients([]);
        }

        // 2. Fetch Census Records Independently
        try {
            const recs = await midwifeAPI.getFHSISLogs(currentMonth);
            setRecords(recs || []);
        } catch (err) {
            console.error("❌ Error fetching census records:", err);
            setRecords([]);
        }

        // 3. Fetch Summary Independently
        try {
            const summ = await midwifeAPI.getMonthlySummary(currentMonth);
            setSummary(summ || {});
        } catch (err) {
            console.error("❌ Error fetching summary:", err);
            setSummary({});
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return { patients, records, summary, isLoading, refreshData };
};