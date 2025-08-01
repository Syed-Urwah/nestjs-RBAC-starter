import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(id: number): Promise<User> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findOneByUsername(username: string): Promise<User> {
    return this.usersRepository.findOne({ where: { username } });
  }

  findOneByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(email: string, username: string, pass: string): Promise<User> {
    const existingUserEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingUserEmail) {
      throw new ConflictException('User with this email already exists');
    }
    const existingUserUsername = await this.usersRepository.findOne({ where: { username } });
    if (existingUserUsername) {
      throw new ConflictException('User with this username already exists');
    }
    const hashedPassword = await bcrypt.hash(pass, 10);
    const newUser = this.usersRepository.create({ username, password: hashedPassword, email });
    return this.usersRepository.save(newUser);
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
