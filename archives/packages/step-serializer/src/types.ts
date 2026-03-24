export interface StepHeader {
  description: string[];
  implementationLevel: string;
  name: string;
  timeStamp: string;
  author: string[];
  organization: string[];
  preprocessorVersion: string;
  originatingSystem: string;
  authorization: string;
  schemas: string[];
}

export interface StepEntityInstance {
  id: number;
  typeName: string;
  attributes: StepValue[];
}

export class StepEntityRef {
  constructor(public readonly id: number) {}
}

export class StepEnum {
  constructor(public readonly value: string) {}
}

export class StepTypedValue {
  constructor(
    public readonly typeName: string,
    public readonly value: StepValue,
  ) {}
}

export class StepDerived {
  static readonly instance = new StepDerived();
  private constructor() {}
}

export type StepValue =
  | number
  | string
  | boolean
  | null
  | StepDerived
  | StepEntityRef
  | StepEnum
  | StepTypedValue
  | StepValue[];

export interface StepFile {
  header: StepHeader;
  entities: Map<number, StepEntityInstance>;
}
