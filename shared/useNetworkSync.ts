import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useNetworkSync() {
    // Initialize state based on current browser status
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // 1. Ensure the database exists as soon as the app boots
        initIndexedDB('MediSensDB', 'offline_patients').then(() => {
            // 2. COLD START CHECK: If we boot up and we are already online, try syncing immediately!
            if (navigator.onLine) {
                triggerSync();
            }
        });

        // 3. Handlers for active browser network events
        // Handlers for browser network events
        const handleOnline = () => {
            setIsOnline(true);
            document.body.classList.remove('offline-mode'); // 🔴 REMOVE CLASS
            triggerSync(); 
        };
        
        const handleOffline = () => {
            setIsOnline(false);
            document.body.classList.add('offline-mode'); // 🔴 ADD CLASS
        };

        // Also run a check on initial boot
        if (!navigator.onLine) {
            document.body.classList.add('offline-mode');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const triggerSync = async () => {
        setIsSyncing(true);
        
        try {
            // 1. Get all pending records from your IndexedDB
            // (Replace 'MediSensDB' and 'offline_patients' with your actual DB/Store names)
            const offlineRecords = await getOfflineData('MediSensDB', 'offline_patients');
            
            if (offlineRecords.length === 0) {
                setIsSyncing(false);
                return;
            }

            console.log(`Found ${offlineRecords.length} records to sync...`);

            // 2. Loop through and push to Supabase
            for (const record of offlineRecords) {
                const { error } = await supabase
                    .from('patients') // Or 'lab_request', etc.
                    .insert([record.data]);

                if (!error) {
                    // 3. If successful, delete it from local IndexedDB
                    await deleteOfflineData('MediSensDB', 'offline_patients', record.id);
                } else {
                    console.error("Failed to sync record:", error);
                }
            }
        } catch (error) {
            console.error("Sync process failed:", error);
        } finally {
            // Add a tiny delay so the user actually sees the "Syncing..." UI
            setTimeout(() => setIsSyncing(false), 1500); 
        }
    };

    return { isOnline, isSyncing, triggerSync };
}

// ─── INDEXED DB HELPER FUNCTIONS ───
// These interact with the data you saw in the Chrome Application tab

// ─── INDEXED DB INITIALIZATION & WRITE ───

// 1. Creates the database if it doesn't exist yet
export async function initIndexedDB(dbName: string, storeName: string) {
    return new Promise((resolve, reject) => {
        // The "1" is the database version. 
        const request = indexedDB.open(dbName, 1);
        
        // This ONLY runs if the database doesn't exist or the version number increases
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                // Create the store and tell it to look for the 'id' property as the unique key
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

// 2. The missing function from Step 3 used to save the form while offline
export async function saveToIndexedDB(dbName: string, storeName: string, payload: any) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        
        request.onsuccess = (event: any) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Add the payload to the store
            const addReq = store.put(payload); // 'put' inserts or updates if the ID exists
            
            addReq.onsuccess = () => resolve(true);
            addReq.onerror = () => reject(addReq.error);
        };
    });
}

async function getOfflineData(dbName: string, storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event: any) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const getAll = store.getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        };
    });
}

async function deleteOfflineData(dbName: string, storeName: string, id: string | number) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event: any) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const deleteReq = store.delete(id);
            deleteReq.onsuccess = () => resolve(true);
            deleteReq.onerror = () => reject(deleteReq.error);
        };
    });
}