import { AppDataSource } from './database';

import express, { Express } from 'express';
import { pluginMiddleware } from './middlewares/plugin';
import { routeMiddleware } from './middlewares/route';

const app: Express = express();

AppDataSource.initialize()
  .then(async () => {
    console.log('Inserting a new user into the database...');
  })
  .catch((error) => console.log(error));

pluginMiddleware(app);
routeMiddleware(app);

export default app;
