import { initDashboard } from './shared/dashboard-helper';
await initDashboard('BHW', 'withAddress', (p) => String(p.filter((x: any) => x.address).length), true);
