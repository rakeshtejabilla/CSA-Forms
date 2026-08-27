import templatesData from '../data/templates.json';
import { FormField } from '../context/useBuilderStore';

export interface PrebuiltTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  formDefinition: {
    title: string;
    description: string;
    settings: any;
    fields: FormField[];
  };
}

export const getTemplates = (): PrebuiltTemplate[] => {
  return templatesData as PrebuiltTemplate[];
};

export const getTemplateById = (id: string): PrebuiltTemplate | undefined => {
  return (templatesData as PrebuiltTemplate[]).find((t) => t.id === id);
};
