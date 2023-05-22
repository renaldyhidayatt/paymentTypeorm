import { Request, Express } from 'express'
import multer, { StorageEngine } from 'multer'
import { resolve } from 'path'
import { existsSync, unlink } from 'fs'

const diskStorage: StorageEngine = multer.diskStorage({
	destination: (req: Request, file: any, done): void => {
		if (!file) return done(new Error('Upload file error'), '')

		const fileExists = existsSync(resolve(process.cwd(), `src/images/${file.originalname}`))
		if (!fileExists) return done(null, resolve(process.cwd(), 'src/images'))

		unlink(resolve(process.cwd(), `src/images/${file.originalname}`), (error: any): void => {
			if (error) return done(error, '')
			return done(null, resolve(process.cwd(), 'src/images'))
		})
	},

	filename: (req: any, file: any, done): void => {
		if (file) {
			const extFile = file.originalname.replace('.', '')
			const extPattern = /(jpg|jpeg|png|gif|svg)/gi.test(extFile)
			if (!extPattern) return done(new TypeError('File format is not valid'), '')
			req.photo = file.originalname
			return done(null, file.originalname)
		}
	}
})

export const fileUpload = multer({
	storage: diskStorage,
	limits: { fileSize: 1000000 }
})
