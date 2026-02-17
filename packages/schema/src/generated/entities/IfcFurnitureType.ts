import type { IfcFurnishingElementType } from './IfcFurnishingElementType.js';
import type { IfcAssemblyPlaceEnum } from '../enums/IfcAssemblyPlaceEnum.js';
import type { IfcFurnitureTypeEnum } from '../enums/IfcFurnitureTypeEnum.js';

export interface IfcFurnitureType extends IfcFurnishingElementType {
  AssemblyPlace: IfcAssemblyPlaceEnum;
  PredefinedType?: IfcFurnitureTypeEnum | null;
}
