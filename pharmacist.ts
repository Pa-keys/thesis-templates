import { initDashboard } from './shared/dashboard-helper';
await initDashboard('pharmacist', 'uniqueBlood', (p) => String(new Set(p.map((x: any) => x.bloodType).filter(Boolean)).size), false);
