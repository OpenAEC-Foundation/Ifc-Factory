import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcSurfaceTexture } from './IfcSurfaceTexture.js';

export interface IfcSurfaceStyleWithTextures extends IfcPresentationItem {
  Textures: IfcSurfaceTexture[];
}
