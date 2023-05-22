import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import sgMail from '@sendgrid/mail';
import { Withdraw } from '../database/entity/Withdraw';
import {
  IFinNewdWithdrawAmountHistory,
  IFindNewParamsWithdrawAmountHistory,
  IFindNewWithdrawAmount,
  IFindParamsWithdrawAmount,
  IFindParamsWithdrawAmountHistory,
} from '../interface/withdraw';
import { rupiahFormatter } from '../utils/rupiah';
import { dateFormat } from '../utils/date';
import { expressValidator } from '../utils/validator';
import { User } from '../database/entity/User';
import { Saldo } from '../database/entity/Saldo';
import { Log } from '../database/entity/Log';
import { IWithdrawMail } from '../interface/tempmail';
import { tempMailWithdraw } from '../templates/withdraw';
import { ClientResponse } from '@sendgrid/mail';
import { WithdrawDTO } from '../dto/withdraw';

class WithdrawController {
  async resultsWithdraw(req: Request, res: Response): Promise<Response<any>> {
    const findWithdrawAmount = await AppDataSource.getRepository(Withdraw)
      .createQueryBuilder('withdraw')
      .leftJoinAndSelect('withdraw.user', 'user')
      .select([
        'user.userId',
        'user.email',
        'user.nocTransfer',
        'SUM(withdraw.withdrawAmount) as totalWithdrawAmount',
      ])
      .groupBy('user.userId, user.email, user.nocTransfer')
      .orderBy('user.userId', 'ASC')
      .getRawMany();

    if (findWithdrawAmount.length < 1) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'data is not exist',
      });
    }

    const findWithdrawAmountHistory = findWithdrawAmount.map(
      async (
        val: IFindParamsWithdrawAmountHistory
      ): Promise<Array<IFinNewdWithdrawAmountHistory>> => {
        const findSaldoTo = await AppDataSource.getRepository(Withdraw)
          .createQueryBuilder('withdraw')
          .innerJoin('withdraw.user', 'user')
          .select([
            'user.userId',
            'user.email',
            'user.nocTransfer',
            'withdraw.withdrawId',
            'withdraw.withdrawAmount',
            'withdraw.withdrawTime',
          ])
          .where('user.userId = :userId', { userId: val.user_id })
          .groupBy(
            'user.userId, user.email, user.nocTransfer, withdraw.withdrawId, withdraw.withdrawAmount, withdraw.withdrawTime'
          )
          .orderBy('withdraw.withdrawTime', 'DESC')
          .getMany();

        const newFindWithdrawAmountHistory = findSaldoTo.map(
          (val: any): IFinNewdWithdrawAmountHistory => ({
            transfer_id: val.withdraw_id,
            email: val.email,
            kode_transfer: val.noc_transfer,
            nominal_withdraw: rupiahFormatter(val.withdraw_amount.toString()),
            tanggal_withdraw: dateFormat(val.withdraw_time).format('llll'),
          })
        );

        return newFindWithdrawAmountHistory;
      }
    );

    const newWithdrawAmount = findWithdrawAmount.map(
      async (
        val: IFindParamsWithdrawAmount,
        i: number
      ): Promise<IFindNewWithdrawAmount> => ({
        withdraw_history: {
          user_id: val.user_id,
          email: val.email,
          kode_transfer: val.noc_transfer,
          total_nominal_withdraw: rupiahFormatter(
            val.total_withdraw_amount.toString()
          ),
          total_withdraw: await findWithdrawAmountHistory[i],
        },
      })
    );
    const withdrawAmount: any[] = [];

    for (const i of newWithdrawAmount) {
      withdrawAmount.push(await i);
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: withdrawAmount,
    });
  }

  async resutlWithdraw(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const findWithdrawAmount = await AppDataSource.getRepository(Withdraw)
      .createQueryBuilder('withdraw')
      .leftJoin('withdraw.user', 'user')
      .select([
        'user.userId',
        'user.email',
        'user.noc_transfer',
        'SUM(withdraw.withdraw_amount) AS total_withdraw_amount',
      ])
      .where('user.userId = :id', { id: req.params.id })
      .groupBy('user.userId, user.email, user.noc_transfer')
      .orderBy('user.userId', 'ASC')
      .getRawMany();

    const checkUserId = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .select('user.email')
      .where('user.userId = :id', { id: req.params.id })
      .getOne();

    if (findWithdrawAmount.length < 1 && checkUserId[0] == null) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: `${checkUserId[0].email} you never withdraw money`,
      });
    }

    const findWithdrawAmountHistory = findWithdrawAmount.map(
      async (
        val: IFindParamsWithdrawAmountHistory
      ): Promise<Array<IFinNewdWithdrawAmountHistory>> => {
        const findSaldoTo = await AppDataSource.getRepository(Withdraw)
          .createQueryBuilder('withdraw')
          .innerJoinAndSelect('withdraw.user', 'user')
          .select([
            'user.user_id',
            'user.email',
            'user.noc_transfer',
            'withdraw.withdraw_id',
            'withdraw.withdraw_amount',
            'withdraw.withdraw_time',
          ])
          .where('user.user_id = :id', { id: val.user_id })
          .groupBy(
            'user.user_id, user.email, user.noc_transfer, withdraw.withdraw_id, withdraw.withdraw_amount, withdraw.withdraw_time'
          )
          .orderBy('withdraw.withdraw_time', 'DESC')
          .getMany();

        const newFindWithdrawAmountHistory = findSaldoTo.map(
          (val: any): IFinNewdWithdrawAmountHistory => ({
            transfer_id: val.withdraw_id,
            email: val.email,
            kode_transfer: val.noc_transfer,
            nominal_withdraw: rupiahFormatter(val.withdraw_amount.toString()),
            tanggal_withdraw: dateFormat(val.withdraw_time).format('llll'),
          })
        );

        return newFindWithdrawAmountHistory;
      }
    );

    const newWithdrawAmount = findWithdrawAmount.map(
      async (
        val: IFindParamsWithdrawAmount
      ): Promise<IFindNewWithdrawAmount> => ({
        withdraw_history: {
          user_id: val.user_id,
          email: val.email,
          kode_transfer: val.noc_transfer,
          total_nominal_withdraw: rupiahFormatter(
            val.total_withdraw_amount.toString()
          ),
          total_withdraw: await findWithdrawAmountHistory[0],
        },
      })
    );

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: await newWithdrawAmount[0],
    });
  }

  async createWithdraw(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    if (req.body.withdraw_amount <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: 'mininum withdraw balance Rp 50.000',
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const findUser = await userRepository.find({
      select: ['userId', 'email'],
      where: { userId: req.body.user_id },
    });

    if (findUser.length < 1) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, withdraw failed',
      });
    }

    const checkSaldo = await AppDataSource.getRepository(Saldo).findOne({
      where: {
        user: { userId: req.body.user_id },
      },
    });
    if (
      checkSaldo &&
      checkSaldo.totalBalance &&
      checkSaldo.totalBalance <= 49000
    ) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: `${
          findUser[0].email
        } your balance is insufficient ${rupiahFormatter(
          checkSaldo.totalBalance.toString()
        )}`,
      });
    }

    const withdraw = new Withdraw();
    withdraw.user = findUser[0];
    withdraw.withdrawAmount = req.body.withdraw_amount;
    withdraw.withdrawTime = new Date();
    withdraw.createdAt = new Date();

    const savedWithdraw = await AppDataSource.getRepository(Withdraw).save(
      withdraw
    );

    if (!savedWithdraw) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'withdraw failed, server is busy',
      });
    }

    const lastWithdrawAmount = await AppDataSource.getRepository(
      Withdraw
    ).findOne({
      where: { user: { userId: savedWithdraw.user.userId } },
      order: { withdrawTime: 'DESC' },
      select: ['withdrawAmount', 'withdrawTime'],
    });

    const subtractBalance = await AppDataSource.getRepository(Saldo)
      .createQueryBuilder('saldo')
      .select(
        `SUM(totalBalance - ${lastWithdrawAmount.withdrawAmount})`,
        'total_balance'
      )
      .where({ user_id: savedWithdraw.user.userId })
      .execute();

    await AppDataSource.getRepository(Saldo).update(
      { user: { userId: savedWithdraw.user.userId } },
      {
        totalBalance: subtractBalance[0].totalBalance,
        updatedAt: new Date(),
      }
    );

    const log = new Log();
    log.user.userId = savedWithdraw[0].user_id;
    log.logStatus = 'WITHDRAW_BALANCE';
    log.logTime = new Date();
    log.createdAt = new Date();

    await AppDataSource.getRepository(Log).save(log);

    const withdrawAmount = lastWithdrawAmount[0]?.withdrawAmount;
    const totalBalance = subtractBalance[0]?.total_balance;

    const template: IWithdrawMail = tempMailWithdraw(
      findUser[0].email,
      withdrawAmount !== undefined ? withdrawAmount : 0,
      totalBalance !== undefined ? totalBalance : 0
    );

    const sgResponse: [ClientResponse, any] = await sgMail.send(template);

    if (!sgResponse) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message:
          'Internal server error, failed to sending email notification withdraw',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: `withdraw successfully, please check your email ${findUser[0].email}`,
    });
  }

  async updateWithdraw(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const { user_id, withdraw_amount }: WithdrawDTO = req.body;

    if ((withdraw_amount || 0) <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: 'minimum withdraw balance Rp 50.000',
      });
    }

    const checkUserId = await AppDataSource.getRepository(User).findOne({
      where: { userId: user_id },
    });
    const checkWithDrawId = await AppDataSource.getRepository(Withdraw).findOne(
      {
        where: { withdrawId: parseInt(req.params.id) },
      }
    );

    if (checkUserId == null || checkWithDrawId == null) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message:
          'user id or withdraw id is not exist, update data withdraw failed',
      });
    }

    checkWithDrawId.user = checkUserId;
    checkWithDrawId.withdrawAmount = withdraw_amount;
    checkWithDrawId.updatedAt = new Date();

    await AppDataSource.getRepository(Withdraw).save(checkWithDrawId);

    if (checkWithDrawId == null) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'update data withdraw failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'update data withdraw successfully',
    });
  }

  async deleteWithdraw(req: Request, res: Response): Promise<Response<any>> {
    const { id } = req.params;

    const withdrawRepository = AppDataSource.getRepository(Withdraw);

    const withdraw = await withdrawRepository.findOne({
      where: { withdrawId: parseInt(id) },
    });

    if (!withdraw) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'Withdraw id does not exist, failed to delete withdraw data',
      });
    }

    try {
      await withdrawRepository.delete(id);
    } catch (error) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'Failed to delete withdraw data, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'Withdraw data deleted successfully',
    });
  }
}

export default WithdrawController;
