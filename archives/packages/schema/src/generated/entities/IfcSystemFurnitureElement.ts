import type { IfcFurnishingElement } from './IfcFurnishingElement.js';
import type { IfcSystemFurnitureElementTypeEnum } from '../enums/IfcSystemFurnitureElementTypeEnum.js';

export interface IfcSystemFurnitureElement extends IfcFurnishingElement {
  PredefinedType?: IfcSystemFurnitureElementTypeEnum | null;
}
