import type { IfcPositioningElement } from './IfcPositioningElement.js';
import type { IfcReferentTypeEnum } from '../enums/IfcReferentTypeEnum.js';

export interface IfcReferent extends IfcPositioningElement {
  PredefinedType?: IfcReferentTypeEnum | null;
}
