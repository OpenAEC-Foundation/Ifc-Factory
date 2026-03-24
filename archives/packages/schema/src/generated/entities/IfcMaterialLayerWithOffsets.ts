import type { IfcMaterialLayer } from './IfcMaterialLayer.js';
import type { IfcLayerSetDirectionEnum } from '../enums/IfcLayerSetDirectionEnum.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcMaterialLayerWithOffsets extends IfcMaterialLayer {
  OffsetDirection: IfcLayerSetDirectionEnum;
  OffsetValues: IfcLengthMeasure[];
}
