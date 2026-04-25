export interface Application {
  id: string;
  company: string;
  role: string;
  status: string;
  offerProbability: number;
  createdAt?: any;
  analysis?: {
    summary: string;
    sentiment: number;
    nextSteps: string[];
  };
  strategy?: {
    actionPlan: string;
    emailDraft?: string;
  };
  reasoning?: string;
}

export interface ActionTask {
  id: string;
  applicationId: string;
  actionType: string;
  deadline?: string;
  userId: string;
  status?: string;
  createdAt?: any;
  draftContent?: string;
}
