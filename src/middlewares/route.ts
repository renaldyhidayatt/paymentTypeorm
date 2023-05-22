import { Application, Request, Response } from 'express';
import adminRoute from '../routes/admin';
import userRoute from '../routes/user';
import topupRoute from '../routes/topup';
import transferRoute from '../routes/transfer';
import saldoRoute from '../routes/saldo';
import refreshRoute from '../routes/refresh';
import withdrawRoute from '../routes/withdraw';

export const routeMiddleware = (app: Application): void => {
  app.use('/api/v1', adminRoute);
  app.use('/api/v1', userRoute);
  app.use('/api/v1', topupRoute);
  app.use('/api/v1', transferRoute);
  app.use('/api/v1', saldoRoute);
  app.use('/api/v1', refreshRoute);
  app.use('/api/v1', withdrawRoute);
  app.get('/', (req: Request, res: Response): Response<any> => {
    return res.send('<h1>Welcome To Express Fake Payment Gateway</h1>');
  });
};
