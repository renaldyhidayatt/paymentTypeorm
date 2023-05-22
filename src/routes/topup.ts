import express, { Router } from 'express';
import topupController from '../controllers/Topup';
import { paramsValiator, topupValidator } from '../utils/validator';
import { authJwt } from '../middlewares/auth';
import { roleJwt } from '../middlewares/role';

const router: Router = express.Router();

router.post(
  '/topup',
  [authJwt(), ...topupValidator()],
  new topupController().createTopup
);
router.get('/topup', roleJwt(), new topupController().resultsTopup);
router.get(
  '/topup/:id',
  [authJwt(), ...paramsValiator()],
  new topupController().resultTopup
);
router.delete(
  '/topup/:id',
  [roleJwt(), ...paramsValiator()],
  new topupController().deleteTopup
);
router.put(
  '/topup/:id',
  [roleJwt(), ...paramsValiator(), ...topupValidator()],
  new topupController().updateTopup
);

export default router;
