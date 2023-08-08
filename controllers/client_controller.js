const { Client, LocalAuth, MessageMedia, Buttons, Contact } = require('whatsapp-web.js');
const qrcode = require('qrcode');

require('dotenv').config();
const { validationResult } = require('express-validator');
const CircularJSON = require('circular-json');

const axios = require('axios');
const pool = require('../services/db');

const secret_key = process.env.AUTH_API

// untuk menyimpan object klien
let clients = []

// QUERY INSERT TO CLIENTS TABLE
const insert = async (client, callback) => {

    const query = "INSERT INTO clients SET ?";

    pool.getConnection((err, connection) => {
        if (err){
            callback(err, null);
            return;
        } else {
            connection.query(query, client, (err, result) => {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, result)
                }
            });
        }
    });
}

// QUERY SELECT BY NAME
const select = async (name, callback) => {
    const query = `SELECT * FROM clients WHERE name = '${name}'`;

    pool.getConnection((err, connection) => {
        if (err) {
            callback(err, null);
            return;
        } else {
            connection.query(query, (err, result) => {
                connection.release();
                if(err){
                    callback(err, null);
                } else {
                    callback(null, result);
                }
            });
        }
    });
}

// QUERY UPDATE BY NAME
const update = async (client, name, callback) => {
    const query = `UPDATE clients SET ? WHERE name = '${name}'`;

    pool.getConnection((err, connection) => {
        if (err) {
            callback(err, null);
            return;
        } else {
            connection.query(query, client, (err, result) => {
                connection.release();
                if(err){
                    callback(err, null);
                } else {
                    callback(null, result);
                }
            });
        }
    });
}

// FUNCTION CREATE CLIENT
const createClient = async (clientName) => {

    const client = new Client({
        puppeteer: {
            headless: true,
            executablePath: process.env.CHROMIUM_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        authStrategy: new LocalAuth({ clientId: `${clientName}` })
    });

    const newClient = {
        name: clientName,
        qrcode: "please wait a minute",
        status: "on-create",
    }

    insert(newClient, (err, result) => {
        if(err){
            console.error(err);
        } else {
            console.log(`create client : ${clientName}`);
        }
    });

    client.initialize();

    client.on('qr', async (qr) => {
        const qr_url = await qrcode.toDataURL(qr);

        const updateQR = {
            qrcode: qr_url,
            status: "on-qr"
        }
        update(updateQR, clientName, (err, result) => {
            if (err){
                console.error(err);
            } else {
                console.log(`update qrcode ${clientName}`);
            }
        });
    });

    client.on('authenticated', async () => {
        const updateStatus = {
            status: "authenticated"
        }

        update(updateStatus, clientName, (err, result) => {
            if (err){
                console.error(err);
            } else {
                console.log(`update status authenticated on ${clientName}`);
            }
        });
    })

    client.on('ready', async () => {
        const updateClient = {
            status: "ready",
            clientdata: CircularJSON.stringify(client)
        }

        const clientData = {
            name: clientName,
            clientData: client
        }

        clients.push(clientData);

        update(updateClient, clientName, (err, result) => {
            if (err){
                console.error(err);
            } else {
                console.log(`update status ready on ${clientName}`);
            }
        });
    })

    client.on('message', async (message) => {
        if (message.body === "!ping") {
            message.reply('pong');
        } else if (message.body === "!link") {
            client.sendMessage(message.from, "link: https://wwebjs.dev/")
        } else if (message.body.startsWith("!topup")) {
            select(clientName, async (err, result) => {
                if (err) {
                    console.error(err);
                } else {
                    if (result[0].foward === 1){
                        let messageArray = message.body.split(" ")
                        const messageBody = messageArray[1]
                        const messageFrom = message.from;
                        const clientNumber = clientName;
        
                        await axios.post("http://103.186.31.155:3001/topup", {
                            client: clientNumber,
                            number: messageFrom,
                            message: messageBody
                        }).then(function (response) {
                            console.log(response);
                        }).catch(function (error) {
                            console.log(error);
                        });
                    } else {
                        client.sendMessage(message.from, "maaf untuk sementara fitur topup belum tersedia");
                    }
                }
            });
        }
    })

    client.on('disconnected', async (reason) => {
        const updateStatus = {
            status: "logout"
        }
        await update(updateStatus, clientName);
        client.destroy();
        console.log(reason);
    });

}

const newClient = (req, res) => {

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const clientName = req.body.client_name
        const auth = req.query.auth

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth === secret_key) {
                select(clientName, (err, result) => {
                    if(err){
                        console.error(err);
                    } else {
                        if(result.length === 0){
                            res.status(200).json({
                                status: true,
                                message: `Client ${clientName} successfully created`
                            });
                            createClient(clientName, (err, result) => {
                                if (err){
                                    console.error(err);
                                } else {
                                    console.log(result);
                                }
                            });
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `Client with name ${clientName} is already, please insert another name!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
	}
}

const getQRCode = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const clientName = req.body.client_name
        const auth = req.query.auth

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {
                select(clientName, (err, result) => {
                    if (err) {
                        console.error(err);
                    } else {
                        if (result.length === 1){
                            res.status(200).json({
                                status: true,
                                qr_code: result[0].qrcode
                            });
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                });
            }
        }
    }
}

const getStatus = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {
   
        const auth = req.query.auth
        const clientName = req.body.client_name

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {
            
                select(clientName, (err, result) => {
                    if (err){
                        console.error(err);
                    } else {
                        if(result.length === 1){
                            res.status(200).json({
                                status: true,
                                client_status: result[0].status
                            });
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
    }
}

const sendMessage = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const auth = req.query.auth;
        const clientName = req.body.client_name;
        let sendTo = req.body.send_to;
        const message = req.body.message;

        var phoneFormat = '@c.us';
        const phoneNumber = sendTo.concat(phoneFormat);

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth === secret_key) {
            
                select(clientName, (err, result) => {
                    if (err) {
                        console.error(err);
                    } else {
                        if (result.length === 1){
                            if (result[0].status === "ready") {
    
                                const client = clients.find(c => c.name == clientName).clientData;
    
                                client.sendMessage(phoneNumber, message).then(response => {
                                    res.status(200).json({
                                        status: true,
                                        message: `success send message to ${sendTo}.`,
                                        response: response
                                    })
                                }).catch(err => {
                                    res.status(500).json({
                                        status: false,
                                        message: `can't send message.`,
                                        error: err
                                    });
                                });
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client status not ready!`
                                });
                            }
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
    }

}

const sendMedia = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const auth = req.query.auth;
        const clientName = req.body.client_name;
        let sendTo = req.body.send_to;
        const caption = req.body.caption;
        const file = req.files.file;
        
        var phoneFormat = '@c.us';
        const phoneNumber = sendTo.concat(phoneFormat);

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {

                const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
    
                select(clientName, (err, result) => {
                    if (err) {
                        console.error(err);
                    } else {
                        if(result.length === 1){
                            if (result[0].status === "ready") {
    
                                const client = clients.find(c => c.name == clientName).clientData;
    
                                client.sendMessage(phoneNumber, media, { caption: caption }).then(response => {
                                    res.status(200).json({
                                        status: true,
                                        message: `success send media to ${sendTo}.`,
                                        response: response
                                    });
                                }).catch(err => {
                                    res.status(500).json({
                                        status: false,
                                        message: `can't send media.`,
                                        error: err
                                    });
                                });
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client status not ready!`
                                });
                            }
                            
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
    }
}

const sendButton = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false, 
            errors: errors.array()
        });
    } else {

        const auth = req.query.auth;

        const clientName = req.body.client_name;
        let sendTo = req.body.send_to;
        const body = req.body.body;
        const bt1 = req.body.button_1;
        const bt2 = req.body.button_2;
        const bt3 = req.body.button_3;
        const title = req.body.title;
        const footer = req.body.footer;

        const newButton = new Buttons(body, [{ body: bt1 }, { body: bt2 }, { body: bt3 }], title, footer);

        var phoneFormat = '@c.us';
        const phoneNumber = sendTo.concat(phoneFormat);

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {

                select(clientName, (err, result) => {
                    if (err){
                        console.error(err);
                    } else {
                        if (result.length === 1){
                            if(result[0].status === "ready"){
    
                                const client = clients.find(c => c.name == clientName).clientData;
    
                                client.sendMessage(phoneNumber, newButton).then(response => {
                                    res.status(200).json({
                                        status: true,
                                        message: `success send button to ${sendTo}.`,
                                        response: response
                                    });
                                }).catch(err => {
                                    res.status(500).json({
                                        status: false,
                                        message: `can't send media.`,
                                        error: err
                                    });
                                })
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client status not ready!`
                                });
                            }
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
    }
}

const setStatus = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const auth = req.query.auth;
        const clientName = req.body.client_name;
        const newStatus = req.body.new_status;

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {

                select(clientName, (err, result) => {
                    if (err){
                        console.error(err);
                    } else {
                        if (result.length === 1){
                            if (result[0].status === "ready"){
    
                                const client =  clients.find(c => c.name == clientName).clientData;
    
                                client.setStatus(newStatus).then(response => {
                                    res.status(200).json({
                                        status: true,
                                        message: `Status ${clientName} updated`,
                                        response: response
                                    });
                                }).catch(err => {
                                    res.status(500).json({
                                        status: false,
                                        message: "can't update status",
                                        err: err
                                    })
                                });
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client status not ready!`
                                });
                            }
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
    }
}

const getPhotoProfile = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const auth = req.query.auth;
        const clientName = req.body.client_name;
        let phone = req.body.phone_number;

        var phoneFormat = '@c.us'
        const phoneNumber = phone.concat(phoneFormat);

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {

                select(clientName, async (err, result) => {
                    if (err) {
                        console.error(err);
                    } else {
                        if (result.length === 1){
                            if (result[0].status === "ready"){
    
                                const client = clients.find(c => c.name == clientName).clientData;
                                const profileUrl = await client.getProfilePicUrl(phoneNumber);
    
                                res.status(200).json({
                                    status: true,
                                    message: "success get photo profile",
                                    profil_url: profileUrl
                                });
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client status not ready!`
                                });
                            }
                        } else {
                            res.status(400).json({
                                status: false,
                                message: `client with name ${clientName} not found!`
                            });
                        }
                    }
                });
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }

        }
    }
}

const changeFowardSetting = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {

        const auth = req.query.auth;
        const clientName = req.body.client_name;
        const fowardSetting = req.body.setting;

        const onlyLettersPattern = /^[A-Za-z0-9]+$/;

        if(!clientName.match(onlyLettersPattern)){
            return res.status(400).json({
                status: false,
                err: "No special characters, please!",
            });
        } else {
            if (auth == secret_key) {
                if (fowardSetting) {
                    select(clientName, async (err, result) => {
                        if (err){
                            console.error(err);
                        } else {
                            if (result.length === 1){
                                if (result[0].status === "ready"){
    
                                    const foward = {
                                        foward: 1
                                    }
    
                                    await update(foward, clientName, (err, result) => {
                                        if (err){
                                            console.error(err);
                                        } else {
                                            console.log(result);
                                        }
                                    });
    
                                    res.status(200).json({
                                        status: true,
                                        message: 'foward setting changed to true successfully.'
                                    });
                                } else {
                                    res.status(400).json({
                                        status: false,
                                        message: `client status not ready!`
                                    });
                                }
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client with name ${clientName} not found!`
                                });
                            }
                        }
                    });
                } else {
                    select(clientName, async (err, result) => {
                        if (err){
                            console.error(err);
                        } else {
                            if (result.length === 1){
                                if (result[0].status === "ready"){
    
                                    const foward = {
                                        foward: 0
                                    }
    
                                    await update(foward, clientName, (err, result) => {
                                        if (err){
                                            console.error(err);
                                        } else {
                                            console.log(result);
                                        }
                                    });
    
                                    res.status(200).json({
                                        status: true,
                                        message: 'foward setting changed to true successfully.'
                                    });
                                } else {
                                    res.status(400).json({
                                        status: false,
                                        message: `client status not ready!`
                                    });
                                }
                            } else {
                                res.status(400).json({
                                    status: false,
                                    message: `client with name ${clientName} not found!`
                                });
                            }
                        }
                    });
                }
            } else {
                res.status(401).json({
                    status: false,
                    message: `unauthorized`
                })
            }
        }
    }
}


module.exports = {
    newClient,
    getQRCode,
    getStatus,
    sendMessage,
    sendMedia,
    sendButton,
    setStatus,
    getPhotoProfile,
    changeFowardSetting
}
