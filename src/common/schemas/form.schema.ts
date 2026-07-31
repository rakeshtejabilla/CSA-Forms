// Form schema types for the monolith
export interface FormTemplateSchema {
  id: string;
  title: string;
  description?: string;
  fields: any[];
  version: number;
  status: string;
  organizationId?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  isXlsForm?: boolean;
  xlsFormUrl?: string;
}
