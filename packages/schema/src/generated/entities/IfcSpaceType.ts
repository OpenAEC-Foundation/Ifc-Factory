import type { IfcSpatialStructureElementType } from './IfcSpatialStructureElementType.js';
import type { IfcSpaceTypeEnum } from '../enums/IfcSpaceTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcSpaceType extends IfcSpatialStructureElementType {
  PredefinedType: IfcSpaceTypeEnum;
  LongName?: IfcLabel | null;
}
