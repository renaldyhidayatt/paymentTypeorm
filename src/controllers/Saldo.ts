import { Request, Response } from 'express';
import { expressValidator } from '../utils/validator';
import { User } from '../database/entity/User';
import { Saldo } from '../database/entity/Saldo';
import { AppDataSource } from '../database';
import { IFindNewBalance } from '../interface/saldo';
import { rupiahFormatter } from '../utils/rupiah';
import { SaldoDTO } from '../dto/saldo';

class SaldoController {
  async createSaldo(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    if (req.body.total_balance <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: 'mininum saldo Rp 50.000',
      });
    }

    const user = await AppDataSource.getRepository(User).findOne(
      req.body.user_id
    );
    const saldo = await AppDataSource.getRepository(Saldo).findOne({
      where: { user },
    });

    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, add saldo failed',
      });
    }

    if (saldo) {
      return res.status(409).json({
        status: res.statusCode,
        method: req.method,
        message: 'saldo user id already exist, add saldo failed',
      });
    }

    const newSaldo = new Saldo();
    newSaldo.user = user;
    newSaldo.totalBalance = req.body.total_balance;
    newSaldo.createdAt = new Date();

    const saveSaldo = await AppDataSource.getRepository(Saldo).save(newSaldo);

    if (Object.keys(saveSaldo[0]).length < 1) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'add saldo failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'add saldo successfully',
    });
  }

  async deleteSaldo(req: Request, res: Response): Promise<Response<any>> {
    const userId = parseInt(req.params.id);

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { userId } });
    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'User not found.',
      });
    }

    const saldoRepository = AppDataSource.getRepository(Saldo);
    const saldo = await saldoRepository.findOne({ where: { user } });
    if (!saldo) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'Saldo not found for the specified user.',
      });
    }

    try {
      await saldoRepository.remove(saldo);
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'Saldo data successfully deleted.',
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'Server error, please try again later.',
      });
    }
  }
  async resultSaldo(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    // const saldoRepository = AppDataSource.getRepository(Saldo);

    const findBalance = await userRepository.find({
      where: { userId: parseInt(req.params.id) },
      select: ['userId', 'email', 'nocTransfer'],
      relations: ['saldo'],
      join: {
        alias: 'user',
        leftJoinAndSelect: {
          saldo: 'user.saldo',
        },
      },
    });

    if (findBalance.length < 1) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist',
      });
    }

    const newBalanceUsers = findBalance.map((val: any): IFindNewBalance => {
      return {
        saldo_history: {
          user_id: val.saldo_user_id,
          email: val.email,
          kode_transfer: val.noc_transfer,
          jumlah_uang: rupiahFormatter(val.total_balance.toString()),
        },
      };
    });

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: newBalanceUsers[0],
    });
  }

  async resultsSaldo(req: Request, res: Response): Promise<Response<any>> {
    const saldoRepository = AppDataSource.getRepository(Saldo);
    // const userRepository = AppDataSource.getRepository(User);

    const findBalance = await saldoRepository.find({
      relations: ['user'],
      select: ['user', 'totalBalance', 'createdAt'],
    });

    const newBalanceUsers = findBalance.map(
      (val: Saldo): IFindNewBalance => ({
        saldo_history: {
          user_id: val.user.userId,
          email: val.user.email,
          kode_transfer: val.user.nocTransfer,
          jumlah_uang: rupiahFormatter(val.totalBalance.toString()),
        },
      })
    );

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: newBalanceUsers,
    });
  }

  async updateSaldo(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const saldoRepository = AppDataSource.getRepository(Saldo);

    const { user_id, total_balance }: SaldoDTO = req.body;

    const user = await AppDataSource.getRepository(User).findOne({
      where: { userId: user_id },
    });

    if (!user) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'User not found',
      });
    }

    const saldo = await saldoRepository.findOne({
      where: { saldoId: parseInt(req.params.id) },
      relations: ['user'],
    });

    if (!saldo) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'Saldo not found',
      });
    }

    saldo.user = user;
    saldo.totalBalance = total_balance;

    try {
      await saldoRepository.save(saldo);

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'Update saldo successfully',
      });
    } catch (error) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message: 'Update saldo failed',
        error,
      });
    }
  }
}

export default SaldoController;
