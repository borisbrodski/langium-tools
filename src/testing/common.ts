export function using<T>(obj: T, block: (it: T) => void): T {
  block(obj);
  return obj;
};

