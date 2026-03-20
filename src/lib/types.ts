export type TimePeriod = 'this_week' | 'this_month' | 'this_quarter' | 'ytd' | 'all_time';

export interface MeetingRecord {
  id: string;
  company: string;
  contactName: string;
  contactTitle: string;
  meetingDate: string | null;
  subStatus: string; // Upcoming, Awaiting Reschedule, Attended, Cancelled
  dateCreated: string;
}

export interface LeadRecord {
  id: string;
  company: string;
  contactName: string;
  contactTitle: string;
  date: string;
  status: string; // Lead, Nurture, Engaged Lead, Closed/Lost, Meeting Booked
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
}

export interface DashboardData {
  meetings: MeetingRecord[];
  leads: LeadRecord[];
  statusCounts: Record<string, number>;
  metrics: DashboardMetrics;
  lastUpdated: string;
}
