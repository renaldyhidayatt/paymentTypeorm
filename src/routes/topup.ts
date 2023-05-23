import express, { Router } from 'express';
import topupController from '../controllers/Topup';
import { paramsValiator, topupValidator } from '../utils/validator';
import { authJwt } from '../middlewares/auth';
import { roleJwt } from '../middlewares/role';

const router: Router = express.Router();
const Topup = new topupController();


router.post(
  '/topup',
  [authJwt(), ...topupValidator()],
  Topup.createTopup
);
router.get('/topup', roleJwt(), Topup.resultsTopup);
router.get(
  '/topup/:id',
  [authJwt(), ...paramsValiator()],
  Topup.resultTopup
);
router.delete(
  '/topup/:id',
  [roleJwt(), ...paramsValiator()],
  Topup.deleteTopup
);
router.put(
  '/topup/:id',
  [roleJwt(), ...paramsValiator(), ...topupValidator()],
  Topup.updateTopup
);

export default router;
