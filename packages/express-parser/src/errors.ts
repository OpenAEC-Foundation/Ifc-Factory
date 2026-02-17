export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export class ParseError extends Error {
  readonly location: SourceLocation;

  constructor(message: string, location: SourceLocation) {
    super(`${message} at line ${location.line}, column ${location.column}`);
    this.name = 'ParseError';
    this.location = location;
  }
}
