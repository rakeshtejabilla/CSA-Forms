export interface SubmissionData {
  [fieldId: string]: any;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

export interface SubmissionPayload {
  data: SubmissionData;
  gpsLocation?: GpsLocation;
  isDraft?: boolean;
}
