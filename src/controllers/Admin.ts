import { Request, Response } from 'express';
import { UsersDTO } from '../dto/users';
import { AppDataSource } from '../database';
import { User } from '../database/entity/User';
import { uniqueOrderNumber } from '../utils/uniqueNumber';
import { hashPassword } from '../utils/encrypt';
import { expressValidator } from '../utils/validator';

class AdminController {
  async createAdmin(req: Request, res: Response): Promise<Response<any>> {
    const { email, password, active, role }: UsersDTO = req.body;

    const userRepository = AppDataSource.getRepository(User);

    try {
      const existingUser = await userRepository.findOne({ where: { email } });
      if (!existingUser) {
        return res.status(404).json({
          status: res.statusCode,
          method: req.method,
          message: 'User not found',
        });
      }

      // Create a new admin user
      const adminUser = new User();
      adminUser.email = email;
      adminUser.nocTransfer = parseInt(uniqueOrderNumber());
      adminUser.password = hashPassword(password!);
      adminUser.active = active;
      adminUser.role = role;
      adminUser.createdAt = new Date();

      const saveAdmin = await userRepository.save(adminUser);

      if (!saveAdmin) {
        return res.status(408).json({
          status: res.statusCode,
          method: req.method,
          message: 'Add new admin user failed, server is busy',
        });
      }

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'Add new admin user successfully',
      });
    } catch (err) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'Internal Server Error',
      });
    }
  }

  async deleteAdmin(req: Request, res: Response): Promise<Response<any>> {
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
      where: { userId: parseInt(req.params.id) },
    });

    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, delete users data failed',
      });
    }

    try {
      await userRepository.delete(user.userId);
    } catch (error) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'delete user data failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'delete user data successfully',
    });
  }

  async resultAdmin(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    try {
      const findUser = await AppDataSource.getRepository(User).findOneOrFail({
        where: { userId: parseInt(req.params.id) },
      });

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'data already exist',
        data: findUser,
      });
    } catch (error) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist',
      });
    }
  }

  async resultsAdmin(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const userRepository = AppDataSource.getRepository(User);

    try {
      const findUsers = await userRepository.find();

      if (findUsers.length < 1) {
        return res.status(404).json({
          status: res.statusCode,
          method: req.method,
          message: 'data is not exist',
        });
      }

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'data already exist',
        data: findUsers,
      });
    } catch (err) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'fetch user data failed, internal server error',
      });
    }
  }
  async updateAdmin(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }
    const { email, password, active, role }: UsersDTO = req.body;
    const userRepository = AppDataSource.getRepository(User);
    const checkUserId = await userRepository.findOne({
      where: { userId: parseInt(req.params.id) },
    });

    if (!checkUserId) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, update users data failed',
      });
    }

    checkUserId.email = email;
    checkUserId.nocTransfer = parseInt(uniqueOrderNumber());
    checkUserId.password = password;
    checkUserId.active = active;
    checkUserId.role = role;
    checkUserId.updatedAt = new Date();

    try {
      await userRepository.save(checkUserId);
    } catch (error) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'update user data failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'update user data successfully',
    });
  }
}

export default AdminController;
