import type { IfcSurfaceTexture } from './IfcSurfaceTexture.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcBinary } from '../types/IfcBinary.js';

export interface IfcBlobTexture extends IfcSurfaceTexture {
  RasterFormat: IfcIdentifier;
  RasterCode: IfcBinary;
}
