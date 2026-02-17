import type { IfcLinearPositioningElement } from './IfcLinearPositioningElement.js';
import type { IfcAlignmentTypeEnum } from '../enums/IfcAlignmentTypeEnum.js';

export interface IfcAlignment extends IfcLinearPositioningElement {
  PredefinedType?: IfcAlignmentTypeEnum | null;
}
