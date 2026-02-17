import type { IfcMaterialUsageDefinition } from './IfcMaterialUsageDefinition.js';
import type { IfcMaterialLayerSet } from './IfcMaterialLayerSet.js';
import type { IfcLayerSetDirectionEnum } from '../enums/IfcLayerSetDirectionEnum.js';
import type { IfcDirectionSenseEnum } from '../enums/IfcDirectionSenseEnum.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcMaterialLayerSetUsage extends IfcMaterialUsageDefinition {
  ForLayerSet: IfcMaterialLayerSet;
  LayerSetDirection: IfcLayerSetDirectionEnum;
  DirectionSense: IfcDirectionSenseEnum;
  OffsetFromReferenceLine: IfcLengthMeasure;
  ReferenceExtent?: IfcPositiveLengthMeasure | null;
}
