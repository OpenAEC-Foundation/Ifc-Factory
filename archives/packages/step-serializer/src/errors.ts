export class StepParseError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'StepParseError';
    this.line = line;
    this.column = column;
  }
}
