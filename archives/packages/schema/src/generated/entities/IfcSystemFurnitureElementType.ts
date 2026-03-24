import type { IfcFurnishingElementType } from './IfcFurnishingElementType.js';
import type { IfcSystemFurnitureElementTypeEnum } from '../enums/IfcSystemFurnitureElementTypeEnum.js';

export interface IfcSystemFurnitureElementType extends IfcFurnishingElementType {
  PredefinedType?: IfcSystemFurnitureElementTypeEnum | null;
}
