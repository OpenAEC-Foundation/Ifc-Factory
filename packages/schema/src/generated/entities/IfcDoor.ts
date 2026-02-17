import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcDoorTypeEnum } from '../enums/IfcDoorTypeEnum.js';
import type { IfcDoorTypeOperationEnum } from '../enums/IfcDoorTypeOperationEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcDoor extends IfcBuiltElement {
  OverallHeight?: IfcPositiveLengthMeasure | null;
  OverallWidth?: IfcPositiveLengthMeasure | null;
  PredefinedType?: IfcDoorTypeEnum | null;
  OperationType?: IfcDoorTypeOperationEnum | null;
  UserDefinedOperationType?: IfcLabel | null;
}
