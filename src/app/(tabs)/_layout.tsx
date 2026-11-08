import AppTabs from '@/components/app-tabs';
import { PlannerProvider } from '@/contexts/planner-context';

export default function TabLayout() {
  return (
    <PlannerProvider>
      <AppTabs />
    </PlannerProvider>
  );
}
