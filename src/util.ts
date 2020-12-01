export function assertIsDefined<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  // eslint-disable-next-line no-null/no-null
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

export function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${JSON.stringify(val)}`);
  }
}
