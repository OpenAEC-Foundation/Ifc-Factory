import type { IfcPropertyTemplateDefinition } from './IfcPropertyTemplateDefinition.js';
import type { IfcPropertySetTemplateTypeEnum } from '../enums/IfcPropertySetTemplateTypeEnum.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcPropertyTemplate } from './IfcPropertyTemplate.js';

export interface IfcPropertySetTemplate extends IfcPropertyTemplateDefinition {
  TemplateType?: IfcPropertySetTemplateTypeEnum | null;
  ApplicableEntity?: IfcIdentifier | null;
  HasPropertyTemplates: IfcPropertyTemplate[];
}
