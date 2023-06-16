const express = require('express')
const router = express.Router()
const clientController = require('../controllers/client_controller')
const { body } = require('express-validator');
const path = require('path');

router.post('/', [body('clientname').notEmpty().withMessage("field clientname is required.").isSlug().withMessage("clientname not valid. please input clientname without space.")], clientController.newClient)

router.get('/qr', [body('clientname').notEmpty().withMessage("field clientname is required.")], clientController.getQRCode)

router.get('/status', [body('clientname').notEmpty().withMessage("field clientname is required.")], clientController.getStatus)

router.post('/sendmessage', [body('clientname').notEmpty().withMessage("field clientname is required."), body('sendto').notEmpty().withMessage("field sendto is required."), body('message').notEmpty().withMessage("field message is required.")], clientController.sendMessage)

router.post('/sendmedia', clientController.sendMedia)

router.post('/sendbutton', [body('clientname').notEmpty().withMessage("field clientname is required."), body('sendto').notEmpty().withMessage("field sendto is required.")], clientController.sendButton)

router.post('/setstatus', [body('clientname').notEmpty().withMessage("field clientname is required."), body('newstatus').notEmpty().withMessage("field newstatus is required.")], clientController.setStatus)

router.get('/photoprofile', [body('clientname').notEmpty().withMessage("field clientname is required."), body('sendto').notEmpty().withMessage("field sendto is required.")], clientController.getPhotoProfile)

router.get('/fowardsetting', [body('clientname').notEmpty().withMessage("field clientname is required."), body('setting').notEmpty().withMessage("field setting is required.")], clientController.changeFowardSetting)


router.get('/generateqr', function(req, res) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
})

module.exports = router