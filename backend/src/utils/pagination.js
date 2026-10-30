export const getPagination = (query = {}, { defaultLimit = 20, maxLimit = 200 } = {}) => {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Math.min(
    Math.max(Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit, 1),
    maxLimit
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return {
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages
  };
};
