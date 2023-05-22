import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import sgMail from '@sendgrid/mail';
import { Transfer } from '../database/entity/Transfer';
import {
  IFindNewParamsTransferTo,
  IFindNewTransferFrom,
  IFindNewTransferTo,
  IFindParamsTransferTo,
  IFindparamsTransferFrom,
} from '../interface/transfer';
import { rupiahFormatter } from '../utils/rupiah';
import { dateFormat } from '../utils/date';
import { expressValidator } from '../utils/validator';
import { User } from '../database/entity/User';
import { TransferDTO } from '../dto/transfer';
import { Saldo } from '../database/entity/Saldo';
import { ITransferMail } from '../interface/tempmail';
import { tempMailTransfer } from '../templates/transfer';
import { ClientResponse } from '@sendgrid/mail';
import { Log } from '../database/entity/Log';

class TransferController {
  async resultsTransfer(req: Request, res: Response): Promise<Response<any>> {
    const findTransferSaldoFrom = await AppDataSource.getRepository(Transfer)
      .createQueryBuilder('transfer')
      .select([
        'users.userId',
        'users.email',
        'users.nocTransfer',
        'transfer.transferFrom',
        'transfer.transferTo',
        'SUM(transfer.transferAmount) as totalTransferAmount',
      ])
      .getMany();

    if (findTransferSaldoFrom.length < 1) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: 'data is not exist',
      });
    }

    const findTransferSaldoTo = findTransferSaldoFrom.map(
      async (val: any): Promise<Array<IFindNewTransferTo>> => {
        const findSaldoTo = await AppDataSource.getRepository(Transfer)
          .createQueryBuilder('transfer')
          .leftJoinAndSelect('transfer.transferTo', 'user')
          .select([
            'user.userId',
            'transfer.transferId',
            'user.email',
            'user.nocTransfer',
            'transfer.transferAmount',
            'transfer.transferTime',
          ])
          .where('transfer.transferFrom = :transferFrom', {
            transferFrom: val.transfer_from,
          })
          .andWhere('transfer.transferTo = :transferTo', {
            transferTo: val.transfer_to,
          })
          .groupBy(
            'user.userId, transfer.transferId, user.email, user.nocTransfer, transfer.transferAmount, transfer.transferTime'
          )
          .orderBy('transfer.transferTime', 'DESC')
          .getRawMany();

        const newfindSaldoTo = findSaldoTo.map(
          (val: IFindNewParamsTransferTo): IFindNewTransferTo => ({
            transfer_id: val.transfer_id,
            email: val.email,
            kode_transfer: val.noc_transfer,
            nominal_transfer: rupiahFormatter(val.transfer_amount.toString()),
            tanggal_transfer: dateFormat(val.transfer_time).format('llll'),
          })
        );

        return newfindSaldoTo;
      }
    );

    const newTransferSaldo = findTransferSaldoFrom.map(
      async (val: any, i: number): Promise<IFindNewTransferFrom> => ({
        transfer_history: {
          user_id: val.user_id,
          email: val.email,
          kode_transfer: val.noc_transfer,
          total_nominal_transfer: rupiahFormatter(
            val.total_transfer_amount.toString()
          ),
          total_transfer: await findTransferSaldoTo[i],
        },
      })
    );

    const transferSaldo: any = [];

    for (const i of newTransferSaldo) {
      transferSaldo.push(await i);
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: await transferSaldo,
    });
  }

  async resultTransfer(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const findTransferSaldoFrom = await AppDataSource.getRepository(Transfer)
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.transferFrom', 'user')
      .select([
        'user.userId',
        'user.email',
        'user.nocTransfer',
        'SUM(transfer.transferAmount) AS total_transfer_amount',
        'transfer.transferFrom',
        'transfer.transferTo',
      ])
      .where('user.userId = :userId', { userId: req.params.id })
      .groupBy(
        'user.userId, user.email, user.nocTransfer, transfer.transferFrom, transfer.transferTo'
      )
      .orderBy('user.userId', 'ASC')
      .getRawMany();

    const checkUserId = await AppDataSource.getRepository(User).findOne({
      select: ['email'],
      where: {
        userId: parseInt(req.params.id),
      },
    });

    if (findTransferSaldoFrom.length < 1 && checkUserId !== null) {
      return res.status(200).json({
        status: res.statusCode,
        method: req.method,
        message: `${checkUserId.email} you never transfer money to other people`,
      });
    }

    const findTransferSaldoTo = findTransferSaldoFrom.map(
      async (
        val: IFindParamsTransferTo
      ): Promise<Array<IFindNewTransferTo>> => {
        const findSaldoTo = await AppDataSource.getRepository(Transfer)
          .createQueryBuilder('transfer')
          .leftJoinAndSelect('transfer.transferTo', 'user')
          .select([
            'transfer.transferTo',
            'transfer.transferId',
            'user.email',
            'user.nocTransfer',
            'transfer.transferAmount',
            'transfer.transferTime',
          ])
          .where('transfer.transferTo = :toUserId', {
            toUserId: val.transfer_to,
          })
          .andWhere('transfer.transferFrom = :fromUserId', {
            fromUserId: val.transfer_from,
          })
          .groupBy(
            'transfer.transferTo, transfer.transferId, user.email, user.nocTransfer, transfer.transferAmount, transfer.transferTime'
          )
          .orderBy('transfer.transferTime', 'DESC')
          .getRawMany();

        const newfindSaldoTo = findSaldoTo.map(
          (val: IFindNewParamsTransferTo): IFindNewTransferTo => ({
            transfer_id: val.transfer_id,
            email: val.email,
            kode_transfer: val.noc_transfer,
            nominal_transfer: rupiahFormatter(val.transfer_amount.toString()),
            tanggal_transfer: dateFormat(val.transfer_time).format('llll'),
          })
        );

        return newfindSaldoTo;
      }
    );
    const newTransferSaldo = findTransferSaldoFrom.map(
      async (val: IFindparamsTransferFrom): Promise<IFindNewTransferFrom> => ({
        transfer_history: {
          user_id: val.user_id,
          email: val.email,
          kode_transfer: val.noc_transfer,
          total_nominal_transfer: rupiahFormatter(
            val.total_transfer_amount.toString()
          ),
          total_transfer: await findTransferSaldoTo[0],
        },
      })
    );

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'data already to use',
      data: await newTransferSaldo[0],
    });
  }

  async createTransfer(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const { transfer_from, transfer_to, transfer_amount }: TransferDTO =
      req.body;

    const checkUserIdFrom = await AppDataSource.getRepository(User).find({
      select: ['userId', 'email'],
      where: {
        nocTransfer: transfer_from,
      },
    });

    const checkUserIdTo = await AppDataSource.getRepository(User).find({
      select: ['userId', 'email'],
      where: {
        nocTransfer: transfer_to,
      },
    });

    if (!checkUserIdFrom[0] || !checkUserIdTo[0]) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, transfer balance failed',
      });
    }

    const transferRepository = AppDataSource.getRepository(Transfer);

    const transfer = new Transfer();
    transfer.transferFrom = checkUserIdFrom[0];
    transfer.transferTo = checkUserIdTo[0];
    transfer.transferAmount = transfer_amount;
    transfer.transferTime = dateFormat(new Date()).toDate();
    transfer.createdAt = new Date();

    const saveTransfer = await transferRepository.save(transfer);

    if (Object.keys(saveTransfer).length < 1) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'transfer balance failed, server is busy',
      });
    }

    const checkSaldoFrom = await AppDataSource.getRepository(Saldo).findOne({
      where: { user: checkUserIdFrom[0] },
      select: ['totalBalance'],
    });

    if (checkSaldoFrom == null || checkSaldoFrom.totalBalance == undefined) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'No saldo record found for the specified user',
      });
    } else if (checkSaldoFrom.totalBalance <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: `${
          checkUserIdFrom[0].email
        } your balance is insufficient ${rupiahFormatter(
          checkSaldoFrom[0].total_balance.toString()
        )}`,
      });
    }

    const saldoRepository = AppDataSource.getRepository(Saldo);

    const findSaldoFrom = await saldoRepository
      .createQueryBuilder()
      .select(
        `SUM(total_balance - ${saveTransfer.transferAmount}) as total_balance`
      )
      .where(`user_id = ${checkUserIdFrom[0].userId}`)
      .getRawMany();

    const findSaldoTo = await saldoRepository
      .createQueryBuilder()
      .select(
        `SUM(total_balance + ${saveTransfer[0].transferAmount}) as total_balance`
      )
      .where(`user_id = ${checkUserIdTo[0].userId}`)
      .getRawMany();

    if (!findSaldoFrom[0] || !findSaldoTo[0]) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'saldo id is not exist, transfer balance failed',
      });
    }

    const updateSaldoUserFrom = await saldoRepository.update(
      { user: checkUserIdFrom[0] },
      {
        totalBalance: findSaldoFrom[0].total_balance,
        updatedAt: new Date(),
      }
    );

    const updateSaldoUserTo = await saldoRepository.update(
      { user: checkUserIdTo[0] },
      {
        totalBalance: findSaldoTo[0].total_balance,
        updatedAt: new Date(),
      }
    );

    if (updateSaldoUserFrom == null || updateSaldoUserTo == null) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'transfer balance failed, server is busy',
      });
    }

    const logsRepository = AppDataSource.getRepository(Log);

    await logsRepository
      .createQueryBuilder()
      .insert()
      .values({
        user: checkUserIdFrom[0],
        logStatus: 'TRANSFER_SALDO',
        logTime: new Date(),
        createdAt: new Date(),
      })
      .execute();

    const template: ITransferMail = tempMailTransfer(
      checkUserIdFrom[0].email,
      checkUserIdTo[0].email,
      saveTransfer[0].transfer_amount ?? 0
    );
    const sgResponse: [ClientResponse, any] = await sgMail.send(template);

    if (!sgResponse) {
      return res.status(500).json({
        status: res.statusCode,
        method: req.method,
        message:
          'Internal server error, failed to sending email notification transfer',
      });
    }

    return res.status(201).json({
      status: res.statusCode,
      method: req.method,
      message: `transfer balance successfully, please check your email ${checkUserIdFrom[0].email}`,
    });
  }

  async updateTransfer(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const { transfer_from, transfer_to, transfer_amount }: TransferDTO =
      req.body;

    if (!transfer_amount || transfer_amount <= 49000) {
      return res.status(403).json({
        status: res.statusCode,
        method: req.method,
        message: 'minimum transfer balance is Rp 50.000',
      });
    }

    const checkUserId = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .where('user.transferFrom.userId = :transfer_from', { transfer_from })
      .andWhere('user.transferTo.userId = :transfer_to', { transfer_to })
      .getMany();

    if (checkUserId.length !== 2) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'user id is not exist, update data transfer failed',
      });
    }

    const transferRepository = AppDataSource.getRepository(Transfer);

    const updateTransfer = await transferRepository.update(req.params.id, {
      transferFrom: { userId: transfer_from },
      transferTo: { userId: transfer_to },
      transferAmount: transfer_amount,
      updatedAt: new Date(),
    });

    if (updateTransfer.affected < 1) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'update data transfer failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'update data transfer successfully',
    });
  }

  async deleteTransfer(req: Request, res: Response): Promise<Response<any>> {
    const errors = expressValidator(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: res.statusCode,
        method: req.method,
        errors,
      });
    }

    const transferRepository = AppDataSource.getRepository(Transfer);
    const transfer = await transferRepository.findOne({
      where: {
        transferId: parseInt(req.params.id),
      },
    });

    if (!transfer) {
      return res.status(404).json({
        status: res.statusCode,
        method: req.method,
        message: 'transfer id is not exist, delete data transfer failed',
      });
    }

    await transferRepository.remove(transfer);

    const deleteTransfer = await transferRepository.delete({
      transferId: parseInt(req.params.id),
    });

    if (deleteTransfer.affected === 0) {
      return res.status(408).json({
        status: res.statusCode,
        method: req.method,
        message: 'delete data transfer failed, server is busy',
      });
    }

    return res.status(200).json({
      status: res.statusCode,
      method: req.method,
      message: 'delete data transfer successfully',
    });
  }
}

export default TransferController;
