import type { IfcReinforcingElementType } from './IfcReinforcingElementType.js';
import type { IfcReinforcingMeshTypeEnum } from '../enums/IfcReinforcingMeshTypeEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcBendingParameterSelect } from '../selects/IfcBendingParameterSelect.js';

export interface IfcReinforcingMeshType extends IfcReinforcingElementType {
  PredefinedType: IfcReinforcingMeshTypeEnum;
  MeshLength?: IfcPositiveLengthMeasure | null;
  MeshWidth?: IfcPositiveLengthMeasure | null;
  LongitudinalBarNominalDiameter?: IfcPositiveLengthMeasure | null;
  TransverseBarNominalDiameter?: IfcPositiveLengthMeasure | null;
  LongitudinalBarCrossSectionArea?: IfcAreaMeasure | null;
  TransverseBarCrossSectionArea?: IfcAreaMeasure | null;
  LongitudinalBarSpacing?: IfcPositiveLengthMeasure | null;
  TransverseBarSpacing?: IfcPositiveLengthMeasure | null;
  BendingShapeCode?: IfcLabel | null;
  BendingParameters?: IfcBendingParameterSelect[] | null;
}
