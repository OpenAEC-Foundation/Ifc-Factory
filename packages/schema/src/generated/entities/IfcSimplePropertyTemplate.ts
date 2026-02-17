import type { IfcPropertyTemplate } from './IfcPropertyTemplate.js';
import type { IfcSimplePropertyTemplateTypeEnum } from '../enums/IfcSimplePropertyTemplateTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcPropertyEnumeration } from './IfcPropertyEnumeration.js';
import type { IfcUnit } from '../selects/IfcUnit.js';
import type { IfcStateEnum } from '../enums/IfcStateEnum.js';

export interface IfcSimplePropertyTemplate extends IfcPropertyTemplate {
  TemplateType?: IfcSimplePropertyTemplateTypeEnum | null;
  PrimaryMeasureType?: IfcLabel | null;
  SecondaryMeasureType?: IfcLabel | null;
  Enumerators?: IfcPropertyEnumeration | null;
  PrimaryUnit?: IfcUnit | null;
  SecondaryUnit?: IfcUnit | null;
  Expression?: IfcLabel | null;
  AccessState?: IfcStateEnum | null;
}
