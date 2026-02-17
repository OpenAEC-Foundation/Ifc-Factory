import type { IfcPropertyTemplate } from './IfcPropertyTemplate.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcComplexPropertyTemplateTypeEnum } from '../enums/IfcComplexPropertyTemplateTypeEnum.js';

export interface IfcComplexPropertyTemplate extends IfcPropertyTemplate {
  UsageName?: IfcLabel | null;
  TemplateType?: IfcComplexPropertyTemplateTypeEnum | null;
  HasPropertyTemplates?: IfcPropertyTemplate[] | null;
}
