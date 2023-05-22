import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User } from './entity/User'
import { Transfer } from './entity/Transfer'
import { Topup } from './entity/Topup'
import { Saldo } from './entity/Saldo'
import { Withdraw } from './entity/Withdraw'
import { Log } from './entity/Log'

export const AppDataSource = new DataSource({
	type: 'postgres',
	host: 'localhost',
	port: 5432,
	username: 'postgres',
	password: 'mypassword',
	database: 'payment',
	synchronize: true,
	logging: false,
	entities: [User, Transfer, Topup, Saldo, Withdraw, Log],
	migrations: [],
	subscribers: []
})
