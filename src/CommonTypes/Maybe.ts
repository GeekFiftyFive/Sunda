export class Maybe<T> {
  private value: T;

  private constructor(value?: T) {
    this.value = value;
  }

  public static fromEmpty<V>(): Maybe<V> {
    return new Maybe<V>();
  }

  public static fromValue<V>(value: V): Maybe<V> {
    return new Maybe<V>(value);
  }

  public isEmpty(): boolean {
    return !this.value;
  }

  public getValue(): T {
    if (this.isEmpty()) {
      throw new Error('Attempted to read value of empty Maybe');
    }

    return this.value;
  }
}
