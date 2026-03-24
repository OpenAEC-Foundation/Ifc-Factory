import type { IfcExternalSpatialStructureElement } from './IfcExternalSpatialStructureElement.js';
import type { IfcExternalSpatialElementTypeEnum } from '../enums/IfcExternalSpatialElementTypeEnum.js';

export interface IfcExternalSpatialElement extends IfcExternalSpatialStructureElement {
  PredefinedType?: IfcExternalSpatialElementTypeEnum | null;
}
