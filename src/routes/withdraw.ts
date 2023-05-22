import express, { Router } from 'express';
import withdrawController from '../controllers/Withdraw';
import { paramsValiator, withdrawValidator } from '../utils/validator';
import { authJwt } from '../middlewares/auth';
import { roleJwt } from '../middlewares/role';

const router: Router = express.Router();

router.post(
  '/withdraw',
  [authJwt(), ...withdrawValidator()],
  new withdrawController().createWithdraw
);
router.get('/withdraw', roleJwt(), new withdrawController().resultsWithdraw);
router.get(
  '/withdraw/:id',
  [authJwt(), ...paramsValiator()],
  new withdrawController().resutlWithdraw
);
router.delete(
  '/withdraw/:id',
  [roleJwt(), ...paramsValiator()],
  new withdrawController().deleteWithdraw
);
router.put(
  '/withdraw/:id',
  [roleJwt(), ...paramsValiator(), ...withdrawValidator()],
  new withdrawController().updateWithdraw
);

export default router;
