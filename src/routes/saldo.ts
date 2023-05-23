import express, { Router } from 'express'
import { paramsValiator, saldoValidator } from '../utils/validator'
import { authJwt } from '../middlewares/auth'
import { roleJwt } from '../middlewares/role'
import SaldoController from '../controllers/Saldo'

const router: Router = express.Router()
const Saldo = new SaldoController()

router.post('/user/saldo', [authJwt(), ...saldoValidator()], Saldo.createSaldo)
router.get('/user/saldo', roleJwt(), Saldo.resultsSaldo)
router.get('/user/saldo/:id', [authJwt(), ...paramsValiator()], Saldo.resultSaldo)
router.delete('/user/saldo/:id', [roleJwt(), ...paramsValiator()], Saldo.deleteSaldo)
router.put('/user/saldo/:id', [roleJwt(), ...paramsValiator(), ...saldoValidator()], Saldo.updateSaldo)

export default router
