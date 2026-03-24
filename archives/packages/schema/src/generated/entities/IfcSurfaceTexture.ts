import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcCartesianTransformationOperator2D } from './IfcCartesianTransformationOperator2D.js';

export interface IfcSurfaceTexture extends IfcPresentationItem {
  RepeatS: IfcBoolean;
  RepeatT: IfcBoolean;
  Mode?: IfcIdentifier | null;
  TextureTransform?: IfcCartesianTransformationOperator2D | null;
  Parameter?: IfcIdentifier[] | null;
}
