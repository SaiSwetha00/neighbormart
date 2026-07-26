import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200,
  pagination?: PaginationMeta
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  });
};

export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  errors?: unknown
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined && errors !== null ? { errors } : {}),
  });
};

export const getPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
