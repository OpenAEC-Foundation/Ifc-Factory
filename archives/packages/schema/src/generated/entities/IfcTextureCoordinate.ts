import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcSurfaceTexture } from './IfcSurfaceTexture.js';

export interface IfcTextureCoordinate extends IfcPresentationItem {
  Maps: IfcSurfaceTexture[];
}
