import { Response, Request } from 'express';
import sgMail from '@sendgrid/mail';
import { signAccessToken, verifySignAccessToken } from '../utils/jwt';
import { UsersDTO } from '../dto/users';
import { AppDataSource } from '../database';
import { User } from '../database/entity/User';
import { expressValidator } from '../utils/validator';
import { IJwt } from '../interface/jwt';
import { IRegisterMail, IResendMail, IResetMail } from '../interface/tempmail';
import { tempMailReset } from '../templates/reset';
import { ClientResponse } from '@sendgrid/mail';
import { hashPassword, verifyPassword } from '../utils/encrypt';
import { tempMailResend } from '../templates/resend';
import { randomVCC } from '../utils/randomVcc';
import { tempMailRegister } from '../templates/register';
import { Log } from '../database/entity/Log';
import { dateFormat } from '../utils/date';

class UserController {
  async activation(req: Request, res: Response): Promise<Response<any>> {
    const token = req.params.token;

    try {
      const { email }: UsersDTO = verifySignAccessToken()(req, res, token);

      const user = await AppDataSource.getRepository(User).findOne({
        where: { email },
      });

      if (user.active) {
        return res.status(200).json({
          status: res.statusCode,
          method: req.method,
          message: 'user account has been activated, please log in',
        });
      }

      user.active = true;

      await AppDataSource.getRepository(User).update({ email }, user);

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'activation account successful, please log in',
      });
    } catch (err) {
      return res.status(401).json({
        status: res.statusCode,
        method: req.method,
        message: 'access token expired, please resend new activation token',
      });
    }
  }

  async forgot(req: Request, res: Response): Promise<Response<any>> {
    const userRepository = AppDataSource.getRepository(User);

    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const user = await userRepository.findOne({
      where: { email: req.body.email },
    });
    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'User account for this email is not exist, please register',
      });
    }

    // Check if user account is active
    if (!user.active) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        message:
          'User account is not active, please resend new activation token',
      });
    }

    const { user_id, email }: UsersDTO = user[0];
    const { accessToken }: IJwt = signAccessToken()(
      req,
      res,
      { user_id: user_id, email: email },
      { expiresIn: '1d' }
    );
    const template: IResetMail = tempMailReset(email, accessToken);

    const sgResponse: [ClientResponse, any] = await sgMail.send(template);
    if (!sgResponse) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'Server error failed to sending email activation',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: `forgot password successfuly, please check your email ${email}`,
    });
  }

  async login(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email: req.body.email },
    });

    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'User account does not exist, please register',
      });
    }

    if (!user.active) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        message:
          'User account is not active, please resend new activation token',
      });
    }

    const { userId, email, password }: any = user[0];
    const token: string | any = signAccessToken()(
      req,
      res,
      { user_id: userId, email: email },
      { expiresIn: '1d' }
    );

    if (!password) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: `Internal Server Error: password is not defined`,
      });
    }

    verifyPassword(
      req.body.password,
      password,
      async (err: any, success: boolean): Promise<Response<any>> => {
        if (err) {
          return res.status(500).json({
            status: res.statusCode,
            method: req.method,
            message: `Internal Server Error ${err}`,
          });
        }

        if (!success) {
          return res.status(400).json({
            status: res.statusCode,
            method: req.method,
            message: 'username/password is wrong',
          });
        }

        const logRepository = AppDataSource.getRepository(Log);
        const newLog = logRepository.create({
          user: user,
          logStatus: 'STATUS_LOGIN',
          logTime: new Date(),
          createdAt: new Date(),
        });
        await logRepository.save(newLog);

        const updateFirstLogin = await AppDataSource.getRepository(
          User
        ).findOne({ where: { email } });
        updateFirstLogin.firstLogin = dateFormat(new Date()).toDate();

        if (updateFirstLogin == null) {
          return res.status(200).json({
            status: res.statusCode,
            method: req.method,
            message: 'Login successfully',
            ...token,
          });
        }

        userRepository.save(updateFirstLogin);

        return res.status(500).json({
          status: res.statusCode,
          method: req.method,
          message: `Internal Server Error: verifyPassword function did not return a value`,
        });
      }
    );
  }

  async register(req: Request, res: Response): Promise<Response<any>> {
    const { email, password } = req.body;
    const errors = expressValidator(req);

    const userRepository = AppDataSource.getRepository(User);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        status: res.statusCode,
        method: req.method,
        message: 'user account already exists, please try again',
      });
    }

    const user = userRepository.create({
      email,
      password: hashPassword(password),
      nocTransfer: randomVCC(),
      createdAt: new Date(),
    });

    const savedUser = await userRepository.save(user);

    const { userId } = savedUser;
    const { accessToken }: IJwt = signAccessToken()(
      req,
      res,
      { user_id: userId, email },
      { expiresIn: '5m' }
    );

    const template: IRegisterMail = tempMailRegister(email, accessToken);
    const sgResponse: [ClientResponse, any] = await sgMail.send(template);

    if (!sgResponse) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'Server error failed to sending email activation',
      });
    }

    return res.status(201).json({
      status: res.statusCode,
      method: req.method,
      message: `create new account successfuly, please check your email ${email}`,
    });
  }

  async resend(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const { email } = req.body;
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'User account for this email does not exist, please register',
      });
    }

    if (user.active === true) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'User account has been activated, please login',
      });
    }

    const { userId } = user;
    const { accessToken }: IJwt = signAccessToken()(
      req,
      res,
      { user_id: userId, email },
      { expiresIn: '5m' }
    );

    const template: IResendMail = tempMailResend(email, accessToken);

    const sgResponse: [ClientResponse, any] = await sgMail.send(template);
    if (!sgResponse) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'Server error failed to sending email activation',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: `resend new token activation successfully, please check your email ${email}`,
    });
  }

  async reset(req: Request, res: Response): Promise<Response<any>> {
    try {
      const errors = expressValidator(req);

      if (errors.length > 0) {
        return res.status(400).json({
          status: res.statusCode,
          method: req.method,
          errors,
        });
      }
      const { email }: UsersDTO = verifySignAccessToken()(
        req,
        res,
        req.params.token
      );

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository
        .createQueryBuilder('user')
        .select('user.password')
        .where('user.email = :email', { email })
        .getOne();

      if (!user) {
        return res.status(404).json({
          status: res.statusCode,
          method: req.method,
          message: 'User account does not exist, please register',
        });
      }

      const hashingPassword = hashPassword(req.body.password);
      const result = await userRepository.update(
        { email },
        { password: hashingPassword }
      );

      if (!result.affected) {
        return res.status(200).json({
          status: res.statusCode,
          method: req.method,
          message: 'Update password failed, please try again',
        });
      }

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'Update password successfully, please login',
      });
    } catch (err) {
      return res.status(401).json({
        status: res.statusCode,
        method: req.method,
        message: 'Access token expired, please try forgot password again',
      });
    }
  }
}

export default UserController;
