const path = require('path');
const winston = require('winston');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '../.env') });

winston.addColors({
  silly: 'magenta',
  debug: 'blue',
  verbose: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red',
});

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  level: process.env.LOG_LEVEL,
  prettyPrint: true,
  colorize: true,
  silent: false,
  timestamp: false,
});

if (dotenv.error) {
  winston.error('Create a file named .env at the root of this project and define the necessary environment variables, see .env.example for more details', dotenv.error);
  process.exit();
}

module.exports = process.env;
