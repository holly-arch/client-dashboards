import { TimePeriod } from './types';

export type { TimePeriod };

export interface CampaignRecord {
  id: string;
  clientName: string;
  campaignName: string;
  targetSector: string;
  location: string;
  launchDate: string | null;
  domainsUsed: string;
  inboxes: number;
  emailsSent: number;
  totalReplies: number;
  positiveReplies: number;
  openRate: number | null;
  clickRate: number | null;
  bounceRate: number | null;
  notes: string;
}

export interface LeadReplyRecord {
  id: string;
  clientName: string;
  campaignName: string;
  contactName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  dateReplied: string | null;
  dateEmailSent: string | null;
  notes: string;
}

export type NegativeReplyCategory = 'Not Interested' | 'Wrong Person' | 'Do Not Contact' | 'Uncategorised';

export interface NegativeReplyRecord {
  id: string;
  clientName: string;
  contactName: string;
  company: string;
  contactInfo: string;
  reply: string;
  category: NegativeReplyCategory;
}

export interface TranscendKpis {
  totalCampaigns: number;
  totalEmailsSent: number;
  totalReplies: number;
  positiveReplies: number;
  avgOpenRate: number | null;
  avgClickRate: number | null;
  avgBounceRate: number | null;
}

export interface TranscendDashboardData {
  campaigns: CampaignRecord[];
  leads: LeadReplyRecord[];
  negativeReplies: NegativeReplyRecord[];
  endClients: string[];
  kpis: TranscendKpis;
  lastUpdated: string;
}
