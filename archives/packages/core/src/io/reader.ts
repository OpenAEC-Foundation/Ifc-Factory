import { IfcModel } from '../model/ifc-model.js';

export function readIfcFile(source: string): IfcModel {
  return IfcModel.fromStep(source);
}
