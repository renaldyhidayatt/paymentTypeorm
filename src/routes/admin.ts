import express, { Router } from 'express'
import adminController from '../controllers/Admin'
import { fileUpload } from '../utils/upload'
import { adminValidator, paramsValiator } from '../utils/validator'
import { roleJwt } from '../middlewares/role'

const router: Router = express.Router()
const Admin = new adminController()

router.post('/admin', [...adminValidator(), fileUpload.fields([{ name: 'photo' }])], Admin.createAdmin)
router.get('/admin', roleJwt(), Admin.resultsAdmin)
router.get('/admin/:id', [roleJwt(), ...paramsValiator()], Admin.resultAdmin)
router.delete('/admin/:id', [roleJwt(), ...paramsValiator()], Admin.deleteAdmin)
router.put('/admin/:id', [roleJwt(), ...paramsValiator(), ...adminValidator()], Admin.updateAdmin)

export default router
