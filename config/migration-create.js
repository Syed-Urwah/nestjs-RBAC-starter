const { execSync } = require('child_process');

const name = process.env.npm_config_name;
if (!name) {
  console.error('Please provide a migration name using --name');
  process.exit(1);
}

execSync(`npx typeorm migration:create ./migrations/${name}`, { stdio: 'inherit' });