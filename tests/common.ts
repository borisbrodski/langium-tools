export function using<T>(obj: T, fnc: (t: T) => void) {
  fnc(obj);
}

