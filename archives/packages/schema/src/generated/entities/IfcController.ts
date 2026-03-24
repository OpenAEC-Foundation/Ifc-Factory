import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcControllerTypeEnum } from '../enums/IfcControllerTypeEnum.js';

export interface IfcController extends IfcDistributionControlElement {
  PredefinedType?: IfcControllerTypeEnum | null;
}
