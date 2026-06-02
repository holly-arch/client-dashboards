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
  contractValue?: number;
  monthly: { year: number; month: number; amount: number }[]; // month is 0-indexed
  notes?: string;
  typeOfService?: string;
  // Derived (computed in buildRoiSummary):
  totalContract: number;
  billed: number;
  toBeBilled: number;
}

export interface RoiSummary {
  entries: RoiEntry[];
  opportunities: RoiOpportunity[];
  revenueTotal: number;
  pipelineTotal: number;
  revenue: string;
  pipeline: string;
  revenueNote?: string;
  pipelineNote?: string;
}

export interface WebsiteInboundRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string; // 'Qualified' | 'Disqualified' | ''
  booked: string; // 'Yes' | 'No' | ''
  notes: string;
}

export interface DashboardData {
  meetings: MeetingRecord[];
  leads: LeadRecord[];
  statusCounts: Record<string, number>;
  metrics: DashboardMetrics;
  touchpoints?: { calls?: number; linkedin?: number; email?: number };
  roi?: RoiSummary;
  websiteInbounds?: WebsiteInboundRecord[];
  availableQuarters?: QuarterOption[];
  lastUpdated: string;
}
