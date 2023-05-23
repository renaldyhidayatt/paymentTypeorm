import express, { Router } from 'express'
import transferController from '../controllers/Transfer'
import { paramsValiator, transferValidator } from '../utils/validator'
import { authJwt } from '../middlewares/auth'
import { roleJwt } from '../middlewares/role'

const Transfer = new transferController()

const router: Router = express.Router()

router.post('/transfer', [authJwt(), ...transferValidator()], Transfer.createTransfer)
router.get('/transfer', roleJwt(), Transfer.resultsTransfer)
router.get('/transfer/:id', [authJwt(), ...paramsValiator()], Transfer.resultTransfer)
router.delete('/transfer/:id', [roleJwt(), ...paramsValiator()], Transfer.deleteTransfer)
router.put('/transfer/:id', [roleJwt(), ...paramsValiator(), ...transferValidator()], Transfer.updateTransfer)

export default router
