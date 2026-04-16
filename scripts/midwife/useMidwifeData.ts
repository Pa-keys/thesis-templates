import { useState, useEffect, useCallback } from 'react';
import { midwifeAPI } from './api';

export const useMidwifeData = () => {
    const [patients, setPatients] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        const currentMonth = new Date().toISOString().substring(0, 7);

        // 1. Fetch Patients Independently
        try {
            const pats = await midwifeAPI.getPatients();
            console.log("✅ Patients fetched successfully:", pats);
            setPatients(pats || []);
        } catch (err) {
            console.error("❌ Error fetching patients:", err);
            setPatients([]);
        }

        // 2. Fetch Census Records Independently
        try {
            const recs = await midwifeAPI.getFHSISLogs(currentMonth);
            setRecords(recs || []);
        } catch (err) {
            console.error("❌ Error fetching census records (Check if table exists!):", err);
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