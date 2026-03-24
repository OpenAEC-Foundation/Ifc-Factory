import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcDoorTypeEnum } from '../enums/IfcDoorTypeEnum.js';
import type { IfcDoorTypeOperationEnum } from '../enums/IfcDoorTypeOperationEnum.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcDoorType extends IfcBuiltElementType {
  PredefinedType: IfcDoorTypeEnum;
  OperationType: IfcDoorTypeOperationEnum;
  ParameterTakesPrecedence?: IfcBoolean | null;
  UserDefinedOperationType?: IfcLabel | null;
}
