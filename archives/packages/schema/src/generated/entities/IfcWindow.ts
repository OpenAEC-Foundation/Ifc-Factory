import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcWindowTypeEnum } from '../enums/IfcWindowTypeEnum.js';
import type { IfcWindowTypePartitioningEnum } from '../enums/IfcWindowTypePartitioningEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcWindow extends IfcBuiltElement {
  OverallHeight?: IfcPositiveLengthMeasure | null;
  OverallWidth?: IfcPositiveLengthMeasure | null;
  PredefinedType?: IfcWindowTypeEnum | null;
  PartitioningType?: IfcWindowTypePartitioningEnum | null;
  UserDefinedPartitioningType?: IfcLabel | null;
}
