import { create } from 'zustand';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'select'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'rating'
  | 'gps';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  conditions?: {
    fieldId?: string;
    value?: string;
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface BuilderState {
  formId: string | null;
  title: string;
  description: string;
  fields: FormField[];
  selectedFieldId: string | null;
  settings: {
    submitButtonText: string;
    successMessage: string;
    theme: string;
  };
  past: FormField[][];
  future: FormField[][];
  isDirty: boolean;

  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setFields: (fields: FormField[]) => void;
  addField: (type: FieldType) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  removeField: (id: string) => void;
  reorderFields: (fromIndex: number, toIndex: number) => void;
  selectField: (id: string | null) => void;
  updateSettings: (updates: any) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  reset: () => void;
}

const genId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_LABELS: Record<FieldType, string> = {
  text: 'Short Text Input',
  textarea: 'Long Text Area',
  number: 'Number Input',
  email: 'Email Address',
  select: 'Dropdown Select',
  dropdown: 'Dropdown Select',
  checkbox: 'Checkbox Group',
  radio: 'Radio Buttons',
  date: 'Date Picker',
  file: 'File Upload',
  rating: 'Star Rating',
  gps: 'GPS Location Map',
};

export const useBuilderStore = create<BuilderState>((set) => ({
  formId: null,
  title: 'Untitled Form',
  description: '',
  fields: [],
  selectedFieldId: null,
  settings: {
    submitButtonText: 'Submit Answers',
    successMessage: 'Thank you! Your submission has been securely ingested.',
    theme: 'dark',
  },
  past: [],
  future: [],
  isDirty: false,

  setTitle: (title) => set({ title, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),

  setFields: (fields) =>
    set((state) => ({
      fields,
      past: [...state.past, state.fields],
      future: [],
      isDirty: true,
    })),

  addField: (type) =>
    set((state) => {
      const newField: FormField = {
        id: genId(),
        type,
        label: DEFAULT_LABELS[type],
        placeholder: '',
        required: false,
        options: ['select', 'checkbox', 'radio'].includes(type)
          ? ['Option 1', 'Option 2']
          : undefined,
      };
      return {
        fields: [...state.fields, newField],
        past: [...state.past, state.fields],
        future: [],
        selectedFieldId: newField.id,
        isDirty: true,
      };
    }),

  updateField: (id, updates) =>
    set((state) => ({
      fields: state.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      past: [...state.past, state.fields],
      future: [],
      isDirty: true,
    })),

  removeField: (id) =>
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
      past: [...state.past, state.fields],
      future: [],
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
      isDirty: true,
    })),

  reorderFields: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return {};
      const updated = [...state.fields];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return {
        fields: updated,
        past: [...state.past, state.fields],
        future: [],
        isDirty: true,
      };
    }),

  selectField: (id) => set({ selectedFieldId: id }),

  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
      isDirty: true,
    })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {};
      const previous = state.past[state.past.length - 1];
      const remainingPast = state.past.slice(0, state.past.length - 1);
      return {
        fields: previous,
        past: remainingPast,
        future: [state.fields, ...state.future],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      const remainingFuture = state.future.slice(1);
      return {
        fields: next,
        past: [...state.past, state.fields],
        future: remainingFuture,
      };
    }),

  clearHistory: () => set({ past: [], future: [] }),

  reset: () =>
    set({
      formId: null,
      title: 'Untitled Form',
      description: '',
      fields: [],
      selectedFieldId: null,
      settings: {
        submitButtonText: 'Submit Answers',
        successMessage: 'Thank you! Your submission has been securely ingested.',
        theme: 'dark',
      },
      past: [],
      future: [],
      isDirty: false,
    }),
}));