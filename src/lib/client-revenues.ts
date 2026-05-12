export interface ClientRoi {
  revenue?: string;
  revenueAmount?: number;
  revenueNote?: string;
  pipeline?: string;
  pipelineAmount?: number;
  pipelineNote?: string;
  pipelineCaption?: string;
}

export const CLIENT_ROI: Record<string, ClientRoi> = {
  'Prime Secure': {
    revenue: '£10,295.71',
    revenueAmount: 10295.71,
    revenueNote: 'BrynBuild £1,188.57 + Coffey Construction Ltd £9,107.14',
  },
  'Select Group': {
    revenue: '£18,000',
    revenueAmount: 18000,
  },
  'Catapult Marketing': {
    revenue: '£18,900',
    revenueAmount: 18900,
  },
  'Trust Hire': {
    revenue: '£34,280',
    revenueAmount: 34280,
    revenueNote: 'YTL',
    pipeline: '£184,490',
    pipelineAmount: 184490,
    pipelineNote: 'YTL £59,240 + Lancer Scott £121,250 + Armac £4,000 (in June)',
    pipelineCaption: '',
  },
};

function formatGBP(n: number): string {
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export function getRoiFor(clientName: string): ClientRoi | undefined {
  return CLIENT_ROI[clientName];
}

export function getGroupRoi(clientNames: string[]): { revenue?: string; pipeline?: string } {
  const revenueTotal = clientNames.reduce((s, n) => s + (CLIENT_ROI[n]?.revenueAmount ?? 0), 0);
  const pipelineTotal = clientNames.reduce((s, n) => s + (CLIENT_ROI[n]?.pipelineAmount ?? 0), 0);
  return {
    revenue: revenueTotal > 0 ? formatGBP(revenueTotal) : undefined,
    pipeline: pipelineTotal > 0 ? formatGBP(pipelineTotal) : undefined,
  };
}
