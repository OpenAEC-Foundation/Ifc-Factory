import type { IfcReinforcingElement } from './IfcReinforcingElement.js';
import type { IfcTendonTypeEnum } from '../enums/IfcTendonTypeEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';
import type { IfcForceMeasure } from '../types/IfcForceMeasure.js';
import type { IfcPressureMeasure } from '../types/IfcPressureMeasure.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';

export interface IfcTendon extends IfcReinforcingElement {
  PredefinedType?: IfcTendonTypeEnum | null;
  NominalDiameter?: IfcPositiveLengthMeasure | null;
  CrossSectionArea?: IfcAreaMeasure | null;
  TensionForce?: IfcForceMeasure | null;
  PreStress?: IfcPressureMeasure | null;
  FrictionCoefficient?: IfcNormalisedRatioMeasure | null;
  AnchorageSlip?: IfcPositiveLengthMeasure | null;
  MinCurvatureRadius?: IfcPositiveLengthMeasure | null;
}
