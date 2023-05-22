import express, { Router, Request, Response } from 'express';
import userController from '../controllers/User';
import { fileUpload } from '../utils/upload';
import {
  registerValidator,
  loginValidator,
  emailValidator,
} from '../utils/validator';

const router: Router = express.Router();

router.post(
  '/user/register',
  [...registerValidator(), fileUpload.fields([{ name: 'photo' }])],
  new userController().register
);
router.post('/user/login', loginValidator(), new userController().login);
router.get(
  '/user/activation/:token',
  emailValidator(),
  new userController().activation
);
router.post('/user/resend-activation', new userController().resend);
router.post(
  '/user/forgot-password',
  emailValidator(),
  new userController().forgot
);
router.post(
  '/user/reset-password/:token',
  emailValidator(),
  new userController().reset
);

export default router;
