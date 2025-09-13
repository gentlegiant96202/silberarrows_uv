import { generateMondayTemplate } from './MondayTemplate';
import { generateTuesdayTemplate } from './TuesdayTemplate';
import { generateWednesdayTemplate } from './WednesdayTemplate';
import { generateThursdayTemplate } from './ThursdayTemplate';
import { generateFridayTemplate } from './FridayTemplate';
import { generateSaturdayTemplate } from './SaturdayTemplate';
import { generateSundayTemplate } from './SundayTemplate';
import type { ContentPillarFormData } from '../types';

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TemplateType = 'A' | 'B';

export interface TemplateGenerator {
  (
    formData: ContentPillarFormData,
    renderImageUrl: string,
    absoluteLogoUrl: string,
    fontFaceCSS: string,
    templateType?: TemplateType
  ): string;
}

export interface TemplateConfig {
  generator: TemplateGenerator;
  supportedTypes: TemplateType[];
  defaultBadgeText: string;
  description: string;
}

// Template Registry - centralized template management
export const TEMPLATE_REGISTRY: Record<DayKey, TemplateConfig> = {
  monday: {
    generator: generateMondayTemplate,
    supportedTypes: ['A', 'B'],
    defaultBadgeText: 'MYTH BUSTER MONDAY',
    description: 'Myth-busting content with fact vs fiction layout'
  },
  tuesday: {
    generator: generateTuesdayTemplate,
    supportedTypes: ['A', 'B'],
    defaultBadgeText: 'TECH TIPS TUESDAY',
    description: 'Technical tips and how-to guides'
  },
  wednesday: {
    generator: generateWednesdayTemplate,
    supportedTypes: ['A', 'B'],
    defaultBadgeText: 'HIGHLIGHT OF THE DAY',
    description: 'Vehicle spotlight with pricing and detailed specifications'
  },
  thursday: {
    generator: generateThursdayTemplate,
    supportedTypes: ['A'],
    defaultBadgeText: 'TRANSFORMATION THURSDAY',
    description: 'Before/after transformations and upgrades'
  },
  friday: {
    generator: generateFridayTemplate,
    supportedTypes: ['A'],
    defaultBadgeText: 'FUN FRIDAY',
    description: 'Fun facts and entertaining automotive content'
  },
  saturday: {
    generator: generateSaturdayTemplate,
    supportedTypes: ['A'],
    defaultBadgeText: 'SOCIAL SATURDAY',
    description: 'Social media focused content and community highlights'
  },
  sunday: {
    generator: generateSundayTemplate,
    supportedTypes: ['A'],
    defaultBadgeText: 'SUNDAY REFLECTION',
    description: 'Inspirational and reflective content'
  }
};

// Utility functions
export const getTemplateConfig = (dayKey: DayKey): TemplateConfig => {
  return TEMPLATE_REGISTRY[dayKey];
};

export const generateTemplate = (
  dayKey: DayKey,
  formData: ContentPillarFormData,
  renderImageUrl: string,
  absoluteLogoUrl: string,
  fontFaceCSS: string,
  templateType: TemplateType = 'A'
): string => {
  const config = getTemplateConfig(dayKey);
  return config.generator(formData, renderImageUrl, absoluteLogoUrl, fontFaceCSS, templateType);
};

export const getSupportedTemplateTypes = (dayKey: DayKey): TemplateType[] => {
  return getTemplateConfig(dayKey).supportedTypes;
};

export const getDefaultBadgeText = (dayKey: DayKey): string => {
  return getTemplateConfig(dayKey).defaultBadgeText;
};
