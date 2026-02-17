import type { IfcFurnishingElement } from './IfcFurnishingElement.js';
import type { IfcFurnitureTypeEnum } from '../enums/IfcFurnitureTypeEnum.js';

export interface IfcFurniture extends IfcFurnishingElement {
  PredefinedType?: IfcFurnitureTypeEnum | null;
}
