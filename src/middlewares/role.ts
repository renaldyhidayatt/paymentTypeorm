import { Request, Response, NextFunction } from 'express';
import { verifySignAccessToken } from '../utils/jwt';
import { AppDataSource } from '../database';
import { UsersDTO } from '../dto/users';
import { message } from '../utils/message';

export const roleJwt =
  () =>
  async (
    req: Request | any,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const tokenHeader: string = req.headers.authorization;

    if (tokenHeader) {
      try {
        const { email }: UsersDTO = verifySignAccessToken()(
          req,
          res,
          tokenHeader.split('Bearer ')[1]
        );
        const userRepo = AppDataSource.getRepository(UsersDTO);
        const findUser = await userRepo.findOne({ where: { email: email } });

        switch (findUser?.role) {
          case 'user':
            await message({
              response: res,
              statusCode: 403,
              method: req.method,
              message: 'Forbidden admin area cannot access this API',
            });
            break;
          default:
            req.admin = findUser;
            return next();
        }
      } catch (err) {
        message({
          response: res,
          statusCode: 401,
          method: req.method,
          message: 'Unauthorization access token expired',
        });
      }
    } else {
      message({
        response: res,
        statusCode: 401,
        method: req.method,
        message: 'Unauthorization access token is required',
      });
    }
  };
