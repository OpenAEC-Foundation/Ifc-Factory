import type { IfcBSplineSurface } from './IfcBSplineSurface.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';
import type { IfcKnotType } from '../enums/IfcKnotType.js';

export interface IfcBSplineSurfaceWithKnots extends IfcBSplineSurface {
  UMultiplicities: IfcInteger[];
  VMultiplicities: IfcInteger[];
  UKnots: IfcParameterValue[];
  VKnots: IfcParameterValue[];
  KnotSpec: IfcKnotType;
}
