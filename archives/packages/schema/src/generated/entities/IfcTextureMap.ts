import type { IfcTextureCoordinate } from './IfcTextureCoordinate.js';
import type { IfcTextureVertex } from './IfcTextureVertex.js';
import type { IfcFace } from './IfcFace.js';

export interface IfcTextureMap extends IfcTextureCoordinate {
  Vertices: IfcTextureVertex[];
  MappedTo: IfcFace;
}
