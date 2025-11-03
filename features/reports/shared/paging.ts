export function makePager<T>(items: T[], perPage: number) {
  const total = Math.ceil(items.length / perPage);

  const pages = Array.from({ length: total }, (_, pageIndex) => {
    const start = pageIndex * perPage;
    const end = start + perPage;
    return {
      pageIndex,
      id: `pdf-page-${pageIndex}`,
      slice: items.slice(start, end),
    };
  });

  return { total, pages };
}
