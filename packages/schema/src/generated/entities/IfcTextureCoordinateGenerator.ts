import type { IfcTextureCoordinate } from './IfcTextureCoordinate.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcTextureCoordinateGenerator extends IfcTextureCoordinate {
  Mode: IfcLabel;
  Parameter?: IfcReal[] | null;
}
