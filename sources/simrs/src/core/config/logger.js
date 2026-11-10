import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  redact: {
    paths: [
      'nik',
      'patient.nik',
      'bpjsCardNumber',
      'authorization',
      '*.password',
      'req.headers.authorization'
    ],
    censor: '[CONFIDENTIAL-REDACTED]'
  },
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard'
        }
      }
    : undefined
});

