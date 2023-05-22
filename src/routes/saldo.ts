import express, { Router } from 'express';
import saldoController from '../controllers/Saldo';
import { paramsValiator, saldoValidator } from '../utils/validator';
import { authJwt } from '../middlewares/auth';
import { roleJwt } from '../middlewares/role';

const router: Router = express.Router();

router.post(
  '/user/saldo',
  [authJwt(), ...saldoValidator()],
  new saldoController().createSaldo
);
router.get('/user/saldo', roleJwt(), new saldoController().resultsSaldo);
router.get(
  '/user/saldo/:id',
  [authJwt(), ...paramsValiator()],
  new saldoController().resultSaldo
);
router.delete(
  '/user/saldo/:id',
  [roleJwt(), ...paramsValiator()],
  new saldoController().deleteSaldo
);
router.put(
  '/user/saldo/:id',
  [roleJwt(), ...paramsValiator(), ...saldoValidator()],
  new saldoController().updateSaldo
);

export default router;
