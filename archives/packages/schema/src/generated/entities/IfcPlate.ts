import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcPlateTypeEnum } from '../enums/IfcPlateTypeEnum.js';

export interface IfcPlate extends IfcBuiltElement {
  PredefinedType?: IfcPlateTypeEnum | null;
}
