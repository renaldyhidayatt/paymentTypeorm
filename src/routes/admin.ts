import express, { Router } from 'express';
import adminController from '../controllers/Admin';
import { fileUpload } from '../utils/upload';
import { adminValidator, paramsValiator } from '../utils/validator';
import { roleJwt } from '../middlewares/role';

const router: Router = express.Router();

router.post(
  '/admin',
  [...adminValidator(), fileUpload.fields([{ name: 'photo' }])],
  new adminController().createAdmin
);
router.get('/admin', roleJwt(), new adminController().resultsAdmin);
router.get(
  '/admin/:id',
  [roleJwt(), ...paramsValiator()],
  new adminController().resultAdmin
);
router.delete(
  '/admin/:id',
  [roleJwt(), ...paramsValiator()],
  new adminController().deleteAdmin
);
router.put(
  '/admin/:id',
  [roleJwt(), ...paramsValiator(), ...adminValidator()],
  new adminController().updateAdmin
);

export default router;
