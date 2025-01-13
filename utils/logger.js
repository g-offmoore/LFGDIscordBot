const pino = require('pino');
const logger = pino({
	level:'trace',
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
		},
	},
});
module.exports = logger;