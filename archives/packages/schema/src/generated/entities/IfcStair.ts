import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcStairTypeEnum } from '../enums/IfcStairTypeEnum.js';

export interface IfcStair extends IfcBuiltElement {
  PredefinedType?: IfcStairTypeEnum | null;
}
