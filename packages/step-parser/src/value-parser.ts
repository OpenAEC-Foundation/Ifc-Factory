import {
  StepEntityRef,
  StepEnum,
  StepTypedValue,
  StepDerived,
  type StepValue,
} from '@ifc-factory/step-serializer';
import type { AttributeInfo } from '@ifc-factory/schema';

export function parseAttributeValue(
  raw: StepValue,
  _attrInfo?: AttributeInfo,
): unknown {
  if (raw === null) return null;
  if (raw instanceof StepDerived) return undefined;
  if (raw instanceof StepEntityRef) return raw.id;
  if (raw instanceof StepEnum) return raw.value;
  if (raw instanceof StepTypedValue) {
    return { type: raw.typeName, value: parseAttributeValue(raw.value) };
  }
  if (Array.isArray(raw)) {
    return raw.map((v) => parseAttributeValue(v));
  }
  // number, string, boolean — pass through
  return raw;
}
