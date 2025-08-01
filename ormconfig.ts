import { DataSource } from 'typeorm';
import { User } from './src/user/user.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'auto-accounting',
  entities: [User],
  migrations: [__dirname + '/migrations/**/*.ts'],
});

export default AppDataSource;
