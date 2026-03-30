import { initDashboard } from '../scripts/dashboard-helper';
await initDashboard('BHW', 'withAddress', (p) => String(p.filter((x: any) => x.address).length), true);
