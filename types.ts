export interface ExtractedData {
  [key: string]: string | number | null;
}

export interface TableRow {
  id: string;
  data: ExtractedData;
  sourceImageName: string;
  timestamp: string;
}

export enum ExtractionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ProcessingState {
  status: ExtractionStatus;
  message?: string;
}