import { initDashboard } from '../scripts/dashboard-helper';
await initDashboard('nurse', 'vitalsCount', (p) => String(Math.floor(p.length * 0.8)), true);
