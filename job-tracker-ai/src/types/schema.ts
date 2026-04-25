import { Timestamp } from "firebase/firestore";

export interface Application {
  id?: string; // Optional before saving, assigned by Firestore
  userId: string;
  company: string;
  role: string;
  status: 'Applied' | 'Under Review' | 'Interview Scheduled' | 'Offer Received' | 'Closed';
  offerProbability: number; // 0 to 100
  sourcePortal?: string;
  cvVersionId?: string;
  createdAt: Timestamp | Date;
}

export interface EmailEvent {
  id?: string;
  applicationId: string;
  emailType: 'APPLICATION_RECEIVED' | 'INTERVIEW_INVITE' | 'REJECTION' | 'OFFER' | 'OTHER';
  sentimentScore: number;
  receivedAt: Timestamp | Date;
  gmailMessageId: string;
}

export interface AgentReasoning {
  id?: string;
  applicationId: string;
  extractorOutput: Record<string, any>;
  analystOutput: Record<string, any>;
  strategistOutput: Record<string, any>;
  createdAt: Timestamp | Date;
}

export interface ActionQueue {
  id?: string;
  applicationId: string;
  actionType: 'FOLLOW_UP' | 'PREP_INTERVIEW' | 'THANK_YOU' | 'NEGOTIATE';
  deadline: Timestamp | Date;
  draftContent?: string;
  status: 'pending' | 'done' | 'snoozed';
}

export interface CvVersion {
  id?: string;
  userId: string;
  label: string;
  storageUrl: string;
  attachmentSha256: string;
  sectionEmbeddings?: number[]; // To hold Gemini's vector outputs
  skillsArray: string[];
}
