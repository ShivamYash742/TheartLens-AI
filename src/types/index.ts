export interface Profile {
  id: string;
  email: string;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  content: string;
  created_at: string;
}

export interface Threat {
  id: string;
  document_id: string;
  type: string;
  cve: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  affected_system: string;
  created_at: string;
}

export interface ThreatSummaryData {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recentThreats: Threat[];
}

export interface ExtractedThreat {
  type: string;
  cve: string;
  severity: string;
  affected_system: string;
}
