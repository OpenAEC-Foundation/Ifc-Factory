import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcTrackElementTypeEnum } from '../enums/IfcTrackElementTypeEnum.js';

export interface IfcTrackElement extends IfcBuiltElement {
  PredefinedType?: IfcTrackElementTypeEnum | null;
}
