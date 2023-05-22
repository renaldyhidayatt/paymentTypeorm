import express, { Router } from 'express';
import transferController from '../controllers/Transfer';
import { paramsValiator, transferValidator } from '../utils/validator';
import { authJwt } from '../middlewares/auth';
import { roleJwt } from '../middlewares/role';

const router: Router = express.Router();

router.post(
  '/transfer',
  [authJwt(), ...transferValidator()],
  new transferController().createTransfer
);
router.get('/transfer', roleJwt(), new transferController().resultsTransfer);
router.get(
  '/transfer/:id',
  [authJwt(), ...paramsValiator()],
  new transferController().resultTransfer
);
router.delete(
  '/transfer/:id',
  [roleJwt(), ...paramsValiator()],
  new transferController().deleteTransfer
);
router.put(
  '/transfer/:id',
  [roleJwt(), ...paramsValiator(), ...transferValidator()],
  new transferController().updateTransfer
);

export default router;
