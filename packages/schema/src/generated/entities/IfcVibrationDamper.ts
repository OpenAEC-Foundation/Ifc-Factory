import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcVibrationDamperTypeEnum } from '../enums/IfcVibrationDamperTypeEnum.js';

export interface IfcVibrationDamper extends IfcElementComponent {
  PredefinedType?: IfcVibrationDamperTypeEnum | null;
}
