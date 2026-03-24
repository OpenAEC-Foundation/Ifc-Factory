import type { IfcTextureCoordinate } from './IfcTextureCoordinate.js';
import type { IfcTessellatedFaceSet } from './IfcTessellatedFaceSet.js';
import type { IfcTextureVertexList } from './IfcTextureVertexList.js';

export interface IfcIndexedTextureMap extends IfcTextureCoordinate {
  MappedTo: IfcTessellatedFaceSet;
  TexCoords: IfcTextureVertexList;
}
