import express, { Router, Request, Response } from 'express'
import { fileUpload } from '../utils/upload'
import { registerValidator, loginValidator, emailValidator } from '../utils/validator'
import UserController from '../controllers/User'

const User = new UserController()

const router: Router = express.Router()

router.post('/user/register', [...registerValidator(), fileUpload.fields([{ name: 'photo' }])], User.register)
router.post('/user/login', loginValidator(), User.login)
router.get('/user/activation/:token', emailValidator(), User.activation)
router.post('/user/resend-activation', User.resend)
router.post('/user/forgot-password', emailValidator(), User.forgot)
router.post('/user/reset-password/:token', emailValidator(), User.reset)

export default router
