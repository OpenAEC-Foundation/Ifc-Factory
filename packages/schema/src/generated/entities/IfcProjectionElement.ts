import type { IfcFeatureElementAddition } from './IfcFeatureElementAddition.js';
import type { IfcProjectionElementTypeEnum } from '../enums/IfcProjectionElementTypeEnum.js';

export interface IfcProjectionElement extends IfcFeatureElementAddition {
  PredefinedType?: IfcProjectionElementTypeEnum | null;
}
