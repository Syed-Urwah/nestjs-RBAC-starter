import { Injectable, UnauthorizedException, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new HttpException('JWT token has expired', HttpStatus.UNAUTHORIZED);
      }
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
