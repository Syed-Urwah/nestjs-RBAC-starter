import { HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { apiResponse } from '../common/helpers/response.helper';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = {email: user.email, username: user.username, sub: user.id, roles: user.roles};
    const token = this.jwtService.sign(payload);
    return apiResponse(HttpStatus.OK, 'Login successful', { access_token: token });
  }

  async signup(email: string, username: string, pass: string) {
    const newUser = await this.userService.create(email,username, pass);
    const { password, ...result } = newUser;
    return apiResponse(HttpStatus.CREATED, 'Signup successful', result);
  }
}