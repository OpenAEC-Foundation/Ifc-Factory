import type { IfcDeepFoundationType } from './IfcDeepFoundationType.js';
import type { IfcCaissonFoundationTypeEnum } from '../enums/IfcCaissonFoundationTypeEnum.js';

export interface IfcCaissonFoundationType extends IfcDeepFoundationType {
  PredefinedType: IfcCaissonFoundationTypeEnum;
}
