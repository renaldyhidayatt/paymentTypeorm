import { Request, Response, NextFunction } from 'express'
import { RecurrenceRule, scheduleJob } from 'node-schedule'
import { AppDataSource } from '../database'
import { LogsDTO } from '../dto/logs'
import { Log } from '../database/entity/Log'

export const cronjob =
	() =>
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const rules = new RecurrenceRule()

		const logRepository = AppDataSource.getRepository(Log)

		rules.date = 1
		rules.month = 6
		rules.year = new Date().getFullYear()

		scheduleJob(rules, async (): Promise<void> => {
			const deleteResult = await logRepository
				.createQueryBuilder()
				.delete()
				.from(Log)
				.where('logTime < :date', { date: new Date(`${new Date().getFullYear()}-06-01`) })
				.execute()

			if (deleteResult.affected && deleteResult.affected > 0) {
				next()
			}
		})

		next()
	}
