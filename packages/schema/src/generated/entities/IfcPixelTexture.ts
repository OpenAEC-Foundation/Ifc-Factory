import type { IfcSurfaceTexture } from './IfcSurfaceTexture.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcBinary } from '../types/IfcBinary.js';

export interface IfcPixelTexture extends IfcSurfaceTexture {
  Width: IfcInteger;
  Height: IfcInteger;
  ColourComponents: IfcInteger;
  Pixel: IfcBinary[];
}
