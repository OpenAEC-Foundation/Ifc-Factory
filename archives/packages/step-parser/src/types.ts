import type { IfcGenericEntity } from '@ifc-factory/schema';

export interface ParseOptions {
  resolveReferences?: boolean;
}

export interface ParseResult {
  schema: string;
  entities: Map<number, IfcGenericEntity>;
  header: {
    name: string;
    timeStamp: string;
    schemas: string[];
  };
}
