export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  EMAIL = 'email',
  DATE = 'date',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DROPDOWN = 'dropdown',
  TEXTAREA = 'textarea',
  FILE = 'file',
  GPS = 'gps',
  IMAGE = 'image',
  BARCODE = 'barcode',
  SIGNATURE = 'signature',
  RATING = 'rating',
  SLIDER = 'slider',
  REPEAT = 'repeat',
  GROUP = 'group',
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: FieldOption[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  placeholder?: string;
  defaultValue?: any;
  appearance?: string;
  helpText?: string;
  groupId?: string;
  relevance?: string;
  constraint?: string;
  calculation?: string;
}
