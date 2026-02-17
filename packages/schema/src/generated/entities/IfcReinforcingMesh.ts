import type { IfcReinforcingElement } from './IfcReinforcingElement.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcReinforcingMeshTypeEnum } from '../enums/IfcReinforcingMeshTypeEnum.js';

export interface IfcReinforcingMesh extends IfcReinforcingElement {
  MeshLength?: IfcPositiveLengthMeasure | null;
  MeshWidth?: IfcPositiveLengthMeasure | null;
  LongitudinalBarNominalDiameter?: IfcPositiveLengthMeasure | null;
  TransverseBarNominalDiameter?: IfcPositiveLengthMeasure | null;
  LongitudinalBarCrossSectionArea?: IfcAreaMeasure | null;
  TransverseBarCrossSectionArea?: IfcAreaMeasure | null;
  LongitudinalBarSpacing?: IfcPositiveLengthMeasure | null;
  TransverseBarSpacing?: IfcPositiveLengthMeasure | null;
  PredefinedType?: IfcReinforcingMeshTypeEnum | null;
}
