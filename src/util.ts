export function assertIsDefined<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  // eslint-disable-next-line no-null/no-null
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}
