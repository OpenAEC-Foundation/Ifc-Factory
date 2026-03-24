import type { IfcModel } from '../model/ifc-model.js';

export function writeIfcFile(model: IfcModel): string {
  return model.toStep();
}
