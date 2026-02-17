export class IdManager {
  private nextId: number;

  constructor(existingIds: Iterable<number> = []) {
    let max = 0;
    for (const id of existingIds) {
      if (id > max) max = id;
    }
    this.nextId = max + 1;
  }

  allocate(): number {
    return this.nextId++;
  }

  peek(): number {
    return this.nextId;
  }
}
