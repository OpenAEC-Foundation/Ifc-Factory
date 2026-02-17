import type { IfcElementComponent } from './IfcElementComponent.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcMechanicalFastenerTypeEnum } from '../enums/IfcMechanicalFastenerTypeEnum.js';

export interface IfcMechanicalFastener extends IfcElementComponent {
  NominalDiameter?: IfcPositiveLengthMeasure | null;
  NominalLength?: IfcPositiveLengthMeasure | null;
  PredefinedType?: IfcMechanicalFastenerTypeEnum | null;
}
