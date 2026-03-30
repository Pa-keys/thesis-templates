import { initDashboard } from '../scripts/dashboard-helper';
await initDashboard('labaratory', 'uniqueBlood', (p) => String(new Set(p.map((x: any) => x.bloodType).filter(Boolean)).size), false);
