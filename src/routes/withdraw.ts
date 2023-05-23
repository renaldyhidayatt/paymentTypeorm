import express, { Router } from 'express'
import { paramsValiator, withdrawValidator } from '../utils/validator'
import { authJwt } from '../middlewares/auth'
import { roleJwt } from '../middlewares/role'
import WithdrawController from '../controllers/Withdraw'

const router: Router = express.Router()

const Withdraw = new WithdrawController()

router.post('/withdraw', [authJwt(), ...withdrawValidator()], Withdraw.createWithdraw)
router.get('/withdraw', roleJwt(), Withdraw.resultsWithdraw)
router.get('/withdraw/:id', [authJwt(), ...paramsValiator()], Withdraw.resutlWithdraw)
router.delete('/withdraw/:id', [roleJwt(), ...paramsValiator()], Withdraw.deleteWithdraw)
router.put('/withdraw/:id', [roleJwt(), ...paramsValiator(), ...withdrawValidator()], Withdraw.updateWithdraw)

export default router
