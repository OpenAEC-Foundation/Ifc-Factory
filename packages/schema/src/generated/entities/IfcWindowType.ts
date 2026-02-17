import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcWindowTypeEnum } from '../enums/IfcWindowTypeEnum.js';
import type { IfcWindowTypePartitioningEnum } from '../enums/IfcWindowTypePartitioningEnum.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcWindowType extends IfcBuiltElementType {
  PredefinedType: IfcWindowTypeEnum;
  PartitioningType: IfcWindowTypePartitioningEnum;
  ParameterTakesPrecedence?: IfcBoolean | null;
  UserDefinedPartitioningType?: IfcLabel | null;
}
