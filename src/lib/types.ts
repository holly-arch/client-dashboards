export type StandardTimePeriod = 'this_week' | 'this_month' | 'this_quarter' | 'ytd' | 'all_time';
export type QuarterPeriod = `q${1 | 2 | 3 | 4}_${number}`;
export type TimePeriod = StandardTimePeriod | QuarterPeriod;

export interface QuarterOption {
  value: QuarterPeriod;
  label: string;
}

export interface MeetingRecord {
  id: string;
  company: string;
  contactName: string;
  contactTitle: string;
  meetingDate: string | null;
  subStatus: string; // Upcoming, Awaiting Reschedule, Attended, Cancelled
  dateCreated: string;
  sheetRowIndex?: number;
  shortStatus?: string;
  partnerStatus?: string;
  industry?: string;
  fleetSize?: number;
  source?: string;
  channel?: string;
  bookedWith?: string;
  // Populated only when the deployment has HubSpot wired up (currently
  // myBasePay). Enrichment is best-effort - any of these can be undefined
  // if the contact wasn't matched in HubSpot.
  hubspotContactUrl?: string;
  hubspotOwner?: string;
  lastContactedIso?: string;
}

export interface LeadRecord {
  id: string;
  company: string;
  contactName: string;
  contactTitle: string;
  date: string;
  status: string; // Lead, Nurture, Engaged Lead, Closed/Lost, Meeting Booked
  sheetRowIndex?: number;
  lytxNotes?: string;
  industry?: string;
  source?: string;
  channel?: string;
}

export interface DashboardMetrics {
  meetingsBooked: number;
  meetingsCancelled: number;
  meetingsSat: number;
  meetingsAttended: number;
  meetingsProjected: number;
  upcoming: number;
  awaitingReschedule: number;
  leadsGenerated: number;
  leadsConvertedToMeetings: number;
  avgFleetSize?: number;
}

export interface TouchpointRow {
  week: string; // ISO date string for the week commencing date
  calls?: number;
  linkedin?: number;
  email?: number;
}

export interface RoiEntry {
  month: string;
  deal: string;
  revenue?: number;
  pipeline?: number;
  notes?: string;
}

export interface RoiOpportunity {
  opportunity: string;
  pipelineValue?: number;
  annualContractValue?: number;
  totalContractValue?: number; // Lifetime value over the full contract duration
  firstMeetingDate?: string;   // ISO date of the first meeting sat for this opportunity
  firstBilledDate?: string;    // ISO date of the first invoice / revenue landed
  totalContractValueGrossMargin?: number; // Sheet-computed: TotalContractValue * client-agreed margin rate (per service type). Column "Total Contract Value Gross Margin".
  monthly: { year: number; month: number; amount: number }[]; // month is 0-indexed
  notes?: string;
  typeOfService?: string;
  // Derived (computed in computeOpportunities):
  totalContract: number;       // Prefers totalContractValue, falls back to annualContractValue, then to sum of monthly
  billed: number;              // Period-filtered: monthly cells in range AND <= today
  cycleMonths?: number;        // Rounded months between firstMeetingDate and firstBilledDate
  grossMarginRate?: number;    // Derived: totalContractValueGrossMargin / totalContractValue. Applied to any period's billing.
  billedGrossMarginInPeriod?: number; // Period-aware: billed(period) * grossMarginRate. Always the "profit on money actually landed" for the filter.
}

export interface RoiTotals {
  annual12moContract: number;         // For all_time: sum of annualContractValue. For a specific period: sum of monthly cells within that period.
  annual12moContractLabel: string;    // Human label for the KPI tile - reflects the current time filter
  totalContractValue: number;         // Sum of totalContractValue (falls back to annualContractValue per row). Time-independent.
  totalBilled: number;                // Sum of billed (period-filtered)
  totalPipeline: number;              // Sum of pipelineValue. Time-independent.
  meetingsBooked: number;             // Passed in from DashboardMetrics - total meetings booked in the current period
  closedCount: number;                // Opportunities with a signed contract value OR any billed revenue
  conversionPct: number;              // closedCount / meetingsBooked * 100 - 0 when meetingsBooked is 0
  totalContractValueGrossMargin: number; // Sum of the sheet's Total Contract Value Gross Margin column - static, ignores the time filter.
  totalBilledGrossMargin: number;        // Sum of billedGrossMarginInPeriod - period-aware, moves with the filter.
  hasGrossMargin: boolean;            // True when at least one opp has an Average Gross Margin cell on the sheet
}

export interface RoiSummary {
  entries: RoiEntry[];
  opportunities: RoiOpportunity[];
  totals: RoiTotals;
  revenueTotal: number;
  pipelineTotal: number;
  revenue: string;
  pipeline: string;
  revenueNote?: string;
  pipelineNote?: string;
}

export interface WebinarRegistrant {
  id: string;
  firstName: string;
  lastName: string;
  organisation: string;
  jobTitle: string;
  question?: string;
}

export interface WarmLeadRecord {
  id: string;
  firstName: string;
  surname: string;
  company: string;
  campaign: string;
  contact: string;
  status: string;
  orrjoNotes: string;
}

export interface WebsiteInboundRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string; // 'Qualified' | 'Disqualified' | ''
  booked: string; // 'Yes' | 'No' | ''
  notes: string;
  createDate?: string; // ISO timestamp, from the sheet's Create Date column
}

// Lytx-specific "Inbounds" tracker - separate Google Sheet (LYTX_INBOUNDS_SHEET_ID
// env var), tab configurable via LYTX_INBOUNDS_TAB (defaults to 'ALL INBOUNDS').
// Different column set from the myBasePay Website Inbounds tab.
export interface LytxInboundRecord {
  id: string;
  createDate?: string;
  firstName: string;
  lastName: string;
  accountName: string;
  orrjoContact: string;
  orrjoStatus: string;
  orrjoNotes: string;
}

export interface DashboardData {
  meetings: MeetingRecord[];
  leads: LeadRecord[];
  statusCounts: Record<string, number>;
  metrics: DashboardMetrics;
  touchpoints?: { calls?: number; linkedin?: number; email?: number };
  roi?: RoiSummary;
  websiteInbounds?: WebsiteInboundRecord[];
  warmLeads?: WarmLeadRecord[];
  webinarRegistrants?: WebinarRegistrant[];
  lytxInbounds?: LytxInboundRecord[];
  availableQuarters?: QuarterOption[];
  lastUpdated: string;
}
