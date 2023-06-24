const express = require('express')
const router = express.Router()
const clientController = require('../controllers/client_controller')
const { body } = require('express-validator');
const path = require('path');

router.post('/', [body('clientname').notEmpty().withMessage("field clientname is required.").isSlug().withMessage("clientname not valid. please input clientname without space.").isString().withMessage("clientname not valid. please input clientname using string")], clientController.newClient)

router.get('/qr', [body('clientname').notEmpty().withMessage("field clientname is required.")], clientController.getQRCode)

router.get('/status', [body('clientname').notEmpty().withMessage("field clientname is required.")], clientController.getStatus)

router.post('/sendmessage', [body('clientname').notEmpty().withMessage("field clientname is required."), body('sendto').notEmpty().withMessage("field sendto is required.").isString().withMessage("type of sendto value is string"), body('message').notEmpty().withMessage("field message is required.").isString().withMessage("type of message value is string")], clientController.sendMessage)

router.post('/sendmedia',[body('clientname').notEmpty().withMessage("field clientname is required."),body('sendto').notEmpty().withMessage("field sendto is required.").isString().withMessage("type of sendto value is string"), body('file').custom((value, {req})=> {if (!req.files.file){throw new Error('File is required')} return true}).withMessage('field file is required'), body('caption').isString().withMessage("type data of caption is string")], clientController.sendMedia)

router.post('/sendbutton', [body('clientname').notEmpty().withMessage("field clientname is required."), body('sendto').notEmpty().withMessage("field sendto is required.").isString(), body('body').notEmpty().withMessage("field body is required.").isString(), body('bt1').notEmpty().withMessage("field bt1 is required.").isString(), body('bt2').notEmpty().withMessage("field bt2 is required.").isString(), body('bt3').notEmpty().withMessage("field bt3 is required.").isString(), body('footer').isString().withMessage("type of field footer is string"), body('title').isString().withMessage("type of field title is string"),], clientController.sendButton)

router.post('/setstatus', [body('clientname').notEmpty().withMessage("field clientname is required."), body('newstatus').notEmpty().withMessage("field newstatus is required.").isString()], clientController.setStatus)

router.get('/photoprofile', [body('clientname').notEmpty().withMessage("field clientname is required."), body('sendto').notEmpty().withMessage("field sendto is required.").isString()], clientController.getPhotoProfile)

router.get('/fowardsetting', [body('clientname').notEmpty().withMessage("field clientname is required."), body('setting').notEmpty().withMessage("field setting is required.").isBoolean().withMessage("Data type of field setting is boolean")], clientController.changeFowardSetting)


router.get('/generateqr', function(req, res) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
})

module.exports = router