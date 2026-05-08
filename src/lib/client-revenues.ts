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
  'V360': {
    revenue: '£67,780',
    revenueAmount: 67780,
    revenueNote: '3000 Security £67,060 + I-On Security £720',
    pipeline: '£459,092',
    pipelineAmount: 459092,
    pipelineNote: '3000 Security £444,682 + CCTV Aware £6,010 + Vistech Services £3,320 + Go Security £5,080',
    pipelineCaption: '',
  },
};

function formatGBP(n: number): string {
  return `£${n.toLocaleString('en-GB')}`;
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
