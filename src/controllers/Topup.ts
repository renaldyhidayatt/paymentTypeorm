import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Saldo } from '../database/entity/Saldo';
import { Topup } from '../database/entity/Topup';
import {
  IFindNewTopup,
  IFindNewTopupHistory,
  IFindParamsHistoryTopup,
  IFindParamsTopup,
  IFindTopupHistory,
} from '../interface/topup';
import { dateFormat } from '../utils/date';
import { rupiahFormatter } from '../utils/rupiah';
import { expressValidator } from '../utils/validator';
import { User } from '../database/entity/User';
import sgMail from '@sendgrid/mail';
import { ClientResponse } from '@sendgrid/mail';
import { uniqueOrderNumber } from '../utils/uniqueNumber';
import { Transfer } from '../database/entity/Transfer';
import { Log } from '../database/entity/Log';
import { ITopupMail } from '../interface/tempmail';
import { tempMailTopup } from '../templates/topup';
import { TopupsDTO } from '../dto/topup';

class TopupController {
  async resultsTopup(req: Request, res: Response): Promise<Response<any>> {
    const findTopupAmount = await AppDataSource.getRepository(Saldo)
      .createQueryBuilder('saldo')
      .leftJoin('saldo.user', 'user')
      .select([
        'user.userId',
        'user.email',
        'user.noc_transfer',
        'SUM(topup.topupAmount) as total_topup_amount',
      ])
      .innerJoin('user.topup', 'topup')
      .groupBy('user.userId, user.email, user.noc_transfer')
      .orderBy('user.userId', 'ASC')
      .getRawMany();

    const findMergeTopupAmount = findTopupAmount.map(
      async (val: IFindParamsTopup): Promise<Array<IFindNewTopupHistory>> => {
        const findTopupAmountHistory: IFindTopupHistory[] =
          await AppDataSource.getRepository(Topup)
            .createQueryBuilder('topup')
            .select([
              'topup.topupId',
              'topup.user.userId',
              'topup.topupNo',
              'topup.topupAmount',
              'topup.topupMethod',
              'topup.topupTime',
            ])
            .where('topup.user.userId = :userId', { userId: val.user_id })
            .groupBy(
              'topup.topupId, topup.userId, topup.topupNo, topup.topupAmount, topup.topupMethod, topup.topupTime'
            )
            .orderBy('topup.topup_time', 'DESC')
            .getRawMany();

        const findNewTopupAmountHistory = findTopupAmountHistory.map(
          (val: IFindParamsHistoryTopup): IFindNewTopupHistory => ({
            topup_id: val.topup_id,
            kode_topup: val.topup_no,
            nominal_topup: rupiahFormatter(val.topup_amount.toString()),
            metode_pembayaran: val.topup_method,
            tanggal_topup: dateFormat(val.topup_time).format('llll'),
          })
        );
        return findNewTopupAmountHistory;
      }
    );

    const findNewTopupAmountUser = findTopupAmount.map(
      async (val: IFindParamsTopup, i: number): Promise<IFindNewTopup> => ({
        topup_history: {
          user_id: val.user_id,
          email: val.email,
          kode_transfer: val.noc_transfer,
          total_nominal_topup: rupiahFormatter(
            val.total_topup_amount.toString()
          ),
          total_topup: await findMergeTopupAmount[i],
        },
      })
    );

    const findStoreTopupAmountHistory: any[] = [];
    for (const i of findNewTopupAmountUser) {
      findStoreTopupAmountHistory.push(await i);
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: findStoreTopupAmountHistory,
    });
  }

  async resultTopup(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const findTopupAmount = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .leftJoin('user.topup', 'topup')
      .select([
        'user.userId',
        'user.email',
        'user.nocTransfer',
        'SUM(topup.topupAmount) as totalTopupAmount',
      ])
      .where('user.userId = :id', { id: req.params.id })
      .groupBy('user.userId, user.email, user.nocTransfer')
      .orderBy('user.userId', 'ASC')
      .getRawMany();

    const findUser = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .select('user.email')
      .where('user.userId = :id', { id: req.params.id })
      .getMany();

    if (findTopupAmount.length < 1 && findUser.length > 0) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: `${findUser[0].email} you never topup money`,
      });
    }

    const findMergeTopupAmount = findTopupAmount.map(
      async (val: IFindParamsTopup): Promise<Array<IFindNewTopupHistory>> => {
        const findTopupAmountHistory: IFindTopupHistory[] =
          await AppDataSource.getRepository(Topup)
            .createQueryBuilder('topup')
            .select([
              'topup.topupId',
              'topup.user',
              'topup.topupNo',
              'topup.topupAmount',
              'topup.topupMethod',
              'topup.topupTime',
            ])
            .where('topup.user.userId = :userId', { userId: val.user_id })
            .groupBy(
              'topup.topupId, topup.user, topup.topupNo, topup.topupAmount, topup.topupMethod, topup.topupTime'
            )
            .orderBy('topup.topupTime', 'DESC')
            .getRawMany();

        const findNewTopupAmountHistory = findTopupAmountHistory.map(
          (val: IFindParamsHistoryTopup): IFindNewTopupHistory => ({
            topup_id: val.topup_id,
            kode_topup: val.topup_no,
            nominal_topup: rupiahFormatter(val.topup_amount.toString()),
            metode_pembayaran: val.topup_method,
            tanggal_topup: dateFormat(val.topup_time).format('llll'),
          })
        );

        return findNewTopupAmountHistory;
      }
    );

    const findNewTopupAmountUser = findTopupAmount.map(
      async (val: IFindParamsTopup): Promise<IFindNewTopup> => {
        return {
          topup_history: {
            user_id: val.user_id,
            email: val.email,
            kode_transfer: val.noc_transfer,
            total_nominal_topup: rupiahFormatter(
              val.total_topup_amount.toString()
            ),
            total_topup: await findMergeTopupAmount[0],
          },
        };
      }
    );

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: await findNewTopupAmountUser[0],
    });
  }

  async createTopup(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    if (req.body.topup_amount <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: 'payment method is not support, please try again',
      });
    }

    const findUser = await AppDataSource.getRepository(User).find({
      where: { userId: req.body.user_id },
    });

    if (findUser.length < 1) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, topup balance failed',
      });
    }

    const saveTopup = AppDataSource.getRepository(Topup).create({
      user: findUser[0],
      topupNo: uniqueOrderNumber(),
      topupAmount: req.body.topup_amount,
      topupMethod: req.body.topup_method,
      topupTime: dateFormat(new Date()),
      createdAt: new Date(),
    });

    await AppDataSource.getRepository(Topup).save(saveTopup);

    if (Object.keys(saveTopup[0]).length < 1) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'topup balance failed, server is busy',
      });
    }

    const { user_id, topup_amount, topup_method }: any = saveTopup[0];

    const checkSaldoUserId = await AppDataSource.getRepository(Saldo)
      .createQueryBuilder()
      .select('saldo.user.userId')
      .where('saldo.user.userId = :user_id', { user_id })
      .getMany();

    if (checkSaldoUserId.length < 1) {
      const newSaldo = AppDataSource.getRepository(Saldo).create({
        user: { userId: user_id },
        totalBalance: topup_amount,
        createdAt: new Date(),
      });
      await AppDataSource.getRepository(Saldo).save(newSaldo);
    } else {
      const findTransferHistory = await AppDataSource.getRepository(Transfer)
        .createQueryBuilder('transfer')
        .select([
          'transfer.transferFrom',
          'SUM(transfer.transferAmount) AS transferAmount',
          'transfer.transferTime',
        ])
        .where('transfer.transferFrom = :userId', {
          userId: checkSaldoUserId[0].user.userId,
        })
        .groupBy('transfer.transferFrom, transfer.transferTime')
        .orderBy('transfer.transferTime', 'DESC')
        .limit(1)
        .getRawMany();

      if (findTransferHistory.length < 0) {
        const findBalanceHistory = await AppDataSource.getRepository(Topup)
          .createQueryBuilder('topup')
          .select(
            'topup.user.userId as userId, SUM(topup.topupAmount) as topupAmount'
          )
          .where('topup.user.userId = :userId', {
            userId: checkSaldoUserId[0].user.userId,
          })
          .groupBy('topup.user.userId')
          .getRawOne();

        await AppDataSource.getRepository(Saldo)
          .createQueryBuilder()
          .update()
          .set({
            totalBalance: findBalanceHistory.topupAmount,
            updatedAt: new Date(),
          })
          .where('user_id = :userId', { userId: findBalanceHistory.userId })
          .execute();
      } else {
        const findBalanceHistory = await AppDataSource.getRepository(Topup)
          .createQueryBuilder('topup')
          .leftJoinAndSelect('topup.user', 'user')
          .select('user.userId')
          .addSelect('SUM(topup.topupAmount)', 'topupAmount')
          .addSelect('topup.topupTime')
          .where('user.userId = :userId', {
            userId: checkSaldoUserId[0].user.userId,
          })
          .groupBy('user.userId, topup.topupTime')
          .orderBy('topup.topupTime', 'DESC')
          .take(1)
          .getOne();

        const findSaldo = await AppDataSource.getRepository(Saldo)
          .createQueryBuilder('saldo')
          .select([
            'saldo.user.userId',
            `SUM(saldo.totalBalance + ${findBalanceHistory.topupAmount}) AS totalBalance`,
          ])
          .where('saldo.user.userId = :userId', {
            userId: findBalanceHistory[0].user.userId,
          })
          .groupBy('saldo.user.userId')
          .getRawOne();

        await AppDataSource.getRepository(Saldo)
          .createQueryBuilder()
          .update(Saldo)
          .set({
            totalBalance: findSaldo.total_balance,
            updatedAt: new Date(),
          })
          .where('user.userId = :userId', { userId: findSaldo.user_id })
          .execute();
      }
    }

    const log = AppDataSource.getRepository(Log).create({
      user: findUser[0],
      logStatus: 'TOPUP_BALANCE',
      logTime: dateFormat(new Date()),
      createdAt: new Date(),
    });

    await AppDataSource.getRepository(Log).save(log);

    const template: ITopupMail = tempMailTopup(
      findUser[0].email,
      topup_method!,
      topup_amount!
    );
    const sgResponse: [ClientResponse, any] = await sgMail.send(template);

    if (!sgResponse) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message:
          'Internal server error, failed to sending email notification topup',
      });
    }

    return res.status(201).json({
      status: res.statusCode,
      method: req.method,
      message: `topup balance successfully, please check your email ${findUser[0].email}`,
    });
  }

  async updateTopup(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const { user_id, topup_no, topup_amount, topup_method }: TopupsDTO =
      req.body;

    if (typeof topup_amount === 'undefined' || topup_amount <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: 'minimum topup balance Rp 50.000',
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { userId: user_id } });
    const topupRepository = AppDataSource.getRepository(Topup);
    const topup = await topupRepository.findOne({
      where: { topupId: parseInt(req.params.id) },
    });

    if (!user || !topup) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id or topup id is not exist, update data topup failed',
      });
    }

    topup.user = user;
    topup.topupNo = topup_no;
    topup.topupAmount = topup_amount;
    topup.topupMethod = topup_method;

    try {
      await topupRepository.save(topup);
    } catch (error) {
      console.log(error);
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'update data topup failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'update data topup successfully',
    });
  }

  async deleteTopup(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const topupRepository = AppDataSource.getRepository(Topup);

    const checkTopup = await topupRepository.findOne({
      where: { topupId: parseInt(req.params.id) },
    });

    if (!checkTopup) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'Topup is not exist, delete data topup failed',
      });
    }

    try {
      await topupRepository.delete(checkTopup.topupId);

      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'Delete data topup successfully',
      });
    } catch (error) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'Delete data topup failed, server is busy',
      });
    }
  }
}

export default TopupController;
