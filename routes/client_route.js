const express = require('express')
const router = express.Router()
const clientController = require('../controllers/client_controller')
const { body } = require('express-validator');
const path = require('path');

router.post('/', [body('client_name').notEmpty().withMessage("field client_name is required.").isString().withMessage("client_name not valid. please input clientname using string")], clientController.newClient);

router.get('/qr', [body('client_name').notEmpty().withMessage("field client_name is required.")], clientController.getQRCode);

router.get('/status', [body('client_name').notEmpty().withMessage("field client_name is required.")], clientController.getStatus);

router.post('/sendmessage', [body('client_name').notEmpty().withMessage("field client_name is required."), body('send_to').notEmpty().withMessage("field send_to is required.").isString().withMessage("type of send_to value is string"), body('message').notEmpty().withMessage("field message is required.").isString().withMessage("type of message value is string")], clientController.sendMessage);

router.post('/sendmedia',[body('client_name').notEmpty().withMessage("field client_name is required."),body('send_to').notEmpty().withMessage("field send_to is required.").isString().withMessage("type of send_to value is string"), body('file').custom((value, {req})=> {if (!req.files.file){throw new Error('File is required')} return true}).withMessage('field file is required'), body('caption').isString().withMessage("type data of caption is string")], clientController.sendMedia);

router.post('/sendbutton', [body('client_name').notEmpty().withMessage("field client_name is required."), body('send_to').notEmpty().withMessage("field send_to is required.").isString(), body('body').notEmpty().withMessage("field body is required.").isString(), body('bt1').notEmpty().withMessage("field bt1 is required.").isString(), body('bt2').notEmpty().withMessage("field bt2 is required.").isString(), body('bt3').notEmpty().withMessage("field bt3 is required.").isString(), body('footer').isString().withMessage("type of field footer is string"), body('title').isString().withMessage("type of field title is string"),], clientController.sendButton);

router.post('/setstatus', [body('client_name').notEmpty().withMessage("field client_name is required."), body('new_status').notEmpty().withMessage("field new_status is required.").isString().withMessage("type data of new_status is string")], clientController.setStatus);

router.get('/photoprofile', [body('client_name').notEmpty().withMessage("field client_name is required."), body('phone_number').notEmpty().withMessage("field phone_number is required.").isString().withMessage("type data of phone_number is string")], clientController.getPhotoProfile);

router.post('/fowardsetting', [body('client_name').notEmpty().withMessage("field client_name is required."), body('setting').notEmpty().withMessage("field setting is required.").isBoolean().withMessage("Data type of field setting is boolean")], clientController.changeFowardSetting);

module.exports = router