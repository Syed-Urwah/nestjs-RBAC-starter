import { HttpStatus } from '@nestjs/common';

export const apiResponse = (statusCode: HttpStatus, message: string, data: any = null) => {
  return {
    statusCode,
    message,
    data,
  };
};
