import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcTrackElementTypeEnum } from '../enums/IfcTrackElementTypeEnum.js';

export interface IfcTrackElementType extends IfcBuiltElementType {
  PredefinedType: IfcTrackElementTypeEnum;
}
