export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}


