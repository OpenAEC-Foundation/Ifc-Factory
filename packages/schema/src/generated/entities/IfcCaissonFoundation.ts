import type { IfcDeepFoundation } from './IfcDeepFoundation.js';
import type { IfcCaissonFoundationTypeEnum } from '../enums/IfcCaissonFoundationTypeEnum.js';

export interface IfcCaissonFoundation extends IfcDeepFoundation {
  PredefinedType?: IfcCaissonFoundationTypeEnum | null;
}
