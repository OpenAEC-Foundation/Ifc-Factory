import { describe, expect, it } from 'vitest';
import {
  readStep,
  writeStep,
  StepEntityRef,
  StepEnum,
  StepTypedValue,
  decodeStepString,
  encodeStepString,
} from '../src/index.js';

const MINIMAL_IFC = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01T00:00:00',('Author'),('Org'),'Preprocessor','System','');
FILE_SCHEMA(('IFC4X3'));
ENDSEC;
DATA;
#1=IFCPROJECT('0001',#2,'TestProject',$,$,$,$,$,$);
#2=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,$,$,1234567890);
#3=IFCPERSONANDORGANIZATION(#5,#6,$);
#4=IFCAPPLICATION(#6,'1.0','TestApp','Test');
#5=IFCPERSON($,'Doe','John',$,$,$,$,$);
#6=IFCORGANIZATION($,'TestOrg',$,$,$);
ENDSEC;
END-ISO-10303-21;`;

describe('step-serializer', () => {
  describe('readStep', () => {
    it('parses header correctly', () => {
      const result = readStep(MINIMAL_IFC);
      expect(result.header.name).toBe('test.ifc');
      expect(result.header.schemas).toEqual(['IFC4X3']);
      expect(result.header.implementationLevel).toBe('2;1');
      expect(result.header.author).toEqual(['Author']);
    });

    it('parses entities correctly', () => {
      const result = readStep(MINIMAL_IFC);
      expect(result.entities.size).toBe(6);

      const project = result.entities.get(1)!;
      expect(project.typeName).toBe('IFCPROJECT');
      expect(project.attributes[0]).toBe('0001');
      expect(project.attributes[1]).toBeInstanceOf(StepEntityRef);
      expect((project.attributes[1] as StepEntityRef).id).toBe(2);
      expect(project.attributes[2]).toBe('TestProject');
      expect(project.attributes[3]).toBeNull(); // $
    });

    it('parses enum values', () => {
      const result = readStep(MINIMAL_IFC);
      const ownerHistory = result.entities.get(2)!;
      const addedEnum = ownerHistory.attributes[3];
      expect(addedEnum).toBeInstanceOf(StepEnum);
      expect((addedEnum as StepEnum).value).toBe('ADDED');
    });

    it('parses booleans', () => {
      const ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('','',(''),(''),'','','');
FILE_SCHEMA(('IFC4X3'));
ENDSEC;
DATA;
#1=IFCTEST(.T.,.F.,$);
ENDSEC;
END-ISO-10303-21;`;
      const result = readStep(ifc);
      const e = result.entities.get(1)!;
      expect(e.attributes[0]).toBe(true);
      expect(e.attributes[1]).toBe(false);
      expect(e.attributes[2]).toBeNull();
    });

    it('parses nested lists', () => {
      const ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('','',(''),(''),'','','');
FILE_SCHEMA(('IFC4X3'));
ENDSEC;
DATA;
#1=IFCTEST((1,2,3),(#10,#20));
ENDSEC;
END-ISO-10303-21;`;
      const result = readStep(ifc);
      const e = result.entities.get(1)!;
      expect(e.attributes[0]).toEqual([1, 2, 3]);
      expect(e.attributes[1]).toHaveLength(2);
    });

    it('parses typed values', () => {
      const ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('','',(''),(''),'','','');
FILE_SCHEMA(('IFC4X3'));
ENDSEC;
DATA;
#1=IFCTEST(IFCLABEL('hello'));
ENDSEC;
END-ISO-10303-21;`;
      const result = readStep(ifc);
      const e = result.entities.get(1)!;
      const tv = e.attributes[0] as StepTypedValue;
      expect(tv).toBeInstanceOf(StepTypedValue);
      expect(tv.typeName).toBe('IFCLABEL');
      expect(tv.value).toBe('hello');
    });
  });

  describe('writeStep', () => {
    it('round-trips correctly', () => {
      const parsed = readStep(MINIMAL_IFC);
      const output = writeStep(parsed);
      const reparsed = readStep(output);

      expect(reparsed.header.name).toBe(parsed.header.name);
      expect(reparsed.header.schemas).toEqual(parsed.header.schemas);
      expect(reparsed.entities.size).toBe(parsed.entities.size);

      for (const [id, entity] of parsed.entities) {
        const reEntity = reparsed.entities.get(id)!;
        expect(reEntity.typeName).toBe(entity.typeName);
        expect(reEntity.attributes.length).toBe(entity.attributes.length);
      }
    });
  });

  describe('unicode', () => {
    it('decodes \\X2\\ sequences', () => {
      expect(decodeStepString('\\X2\\00E9\\X0\\')).toBe('\u00e9');
    });

    it('decodes \\X\\ sequences', () => {
      expect(decodeStepString('\\X\\E9')).toBe('\u00e9');
    });

    it('encodes non-ASCII characters', () => {
      const encoded = encodeStepString('\u00e9');
      expect(encoded).toBe('\\X2\\00E9\\X0\\');
    });

    it('handles escaped backslashes', () => {
      expect(decodeStepString('\\\\')).toBe('\\');
    });

    it('handles escaped quotes', () => {
      expect(decodeStepString("''")).toBe("'");
    });
  });
});
