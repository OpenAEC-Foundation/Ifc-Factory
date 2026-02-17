import type { IfcSurfaceTexture } from './IfcSurfaceTexture.js';
import type { IfcURIReference } from '../types/IfcURIReference.js';

export interface IfcImageTexture extends IfcSurfaceTexture {
  URLReference: IfcURIReference;
}
