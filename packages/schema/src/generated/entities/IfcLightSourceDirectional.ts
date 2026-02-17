import type { IfcLightSource } from './IfcLightSource.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcLightSourceDirectional extends IfcLightSource {
  Orientation: IfcDirection;
}
