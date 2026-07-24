import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  S3_ENDPOINT: Joi.string().required(),
  S3_PORT: Joi.number().default(9000),
  S3_USE_SSL: Joi.boolean().default(false),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().required(),
  OPENSEARCH_URL: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  OAUTH_GOOGLE_CLIENT_ID: Joi.string().required(),
  OAUTH_GOOGLE_CLIENT_SECRET: Joi.string().required(),
  PORT: Joi.number().default(3000),
});
