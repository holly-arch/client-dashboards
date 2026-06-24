// Preview route for the Storfund v2 activity dashboard.
// Accessible at /v2 on any deployment — the underlying /api/storfund route
// is gated by CLIENT_NAME (or by STORFUND_DATA_SHEET_ID being present), so
// non-Storfund deployments will render with empty v2 sections (only the
// lead-gen view will populate). Once approved, this layout gets promoted to
// the default route via the dashboardType variant switch.
import StorfundV2Dashboard from '@/components/StorfundV2Dashboard';

export default function V2Page() {
  return <StorfundV2Dashboard />;
}
