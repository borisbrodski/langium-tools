declare global {
  interface Array<T> {
    sortBy<K extends keyof T, V>(key: K | ((item: T) => V)): this;
  }
}

Array.prototype.sortBy = function <T, K extends keyof T, V>(key: K | ((item: T) => V)): T[] {
  return arraySortBy(this as T[], key);
};


export function arraySortBy<T, K extends keyof T, V>(list: T[], key: K | ((item: T) => V)): T[] {
  const comparator = typeof key === 'function'
    ? key
    : (item: T) => item[key];

  return list.sort((a: T, b: T) => {
    const valA = comparator(a);
    const valB = comparator(b);

    // Handle undefined or null values by moving them to the end, nulls then undefines
    if (valA === undefined && valB === null) return 1;
    if (valB === undefined && valA === null) return -1;
    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return valA - valB;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB);
    }

    // Fallback for other types like Dates, objects with custom compare methods, etc.
    if (valA > valB) return 1;
    if (valA < valB) return -1;
    return 0;
  });
};
