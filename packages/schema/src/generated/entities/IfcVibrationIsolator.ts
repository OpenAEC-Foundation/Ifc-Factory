import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcVibrationIsolatorTypeEnum } from '../enums/IfcVibrationIsolatorTypeEnum.js';

export interface IfcVibrationIsolator extends IfcElementComponent {
  PredefinedType?: IfcVibrationIsolatorTypeEnum | null;
}
