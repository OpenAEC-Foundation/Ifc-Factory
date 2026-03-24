import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcSurfaceOrFaceSurface } from '../selects/IfcSurfaceOrFaceSurface.js';

export interface IfcConnectionSurfaceGeometry extends IfcConnectionGeometry {
  SurfaceOnRelatingElement: IfcSurfaceOrFaceSurface;
  SurfaceOnRelatedElement?: IfcSurfaceOrFaceSurface | null;
}
