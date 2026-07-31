// Submission schema types for the monolith
export interface SubmissionSchema {
  id: string;
  formId: string;
  formVersion: number;
  submitterId?: string;
  submitterName?: string;
  data: any;
  gpsLatitude?: number;
  gpsLongitude?: number;
  isDraft: boolean;
  submittedAt: Date;
}
