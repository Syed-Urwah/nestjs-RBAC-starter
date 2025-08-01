import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from 'typeorm';
import { Role } from '../auth/roles.enum';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({
    type: 'simple-array',
    enum: Role,
    default: [Role.USER],
  })
  roles: Role[];
}
