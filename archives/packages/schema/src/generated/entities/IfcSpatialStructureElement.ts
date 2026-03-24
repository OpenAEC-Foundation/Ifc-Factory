import type { IfcSpatialElement } from './IfcSpatialElement.js';
import type { IfcElementCompositionEnum } from '../enums/IfcElementCompositionEnum.js';

export interface IfcSpatialStructureElement extends IfcSpatialElement {
  CompositionType?: IfcElementCompositionEnum | null;
}
