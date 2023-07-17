const { Client, LocalAuth, MessageMedia, Buttons, Contact } = require('whatsapp-web.js');
const qrcode = require('qrcode');

require('dotenv').config();
const { validationResult } = require('express-validator');
const CircularJSON = require('circular-json');

const conn = require('../services/db');
const axios = require('axios');

const secret_key = process.env.AUTH_API

// untuk menyimpan object klaien
let clients = []

// QUERY INSERT TO CLIENTS TABLE
const insert = async (client) => {
    try {
        const query = "INSERT INTO clients SET ?";
        const result = await new Promise((resolve, reject) => {
            conn.query(query, client, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        });
        return result;

    } catch (error) {
        console.error('Error saat menjalankan operasi INSERT: ', error);
    }
}

// QUERY SELECT BY NAME
const select = async (name) => {
    try {
        const query = `SELECT * FROM clients WHERE name = '${name}'`;
        const result = await new Promise((resolve, reject) => {
            conn.query(query, (err, result, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result)
                }
            });
        });
        return result;
    } catch (error) {
        console.error('Error saat menjalankan query: ', error);
        throw error;
    }
}

// QUERY UPDATE BY NAME
const update = async (client, name) => {
    try {
        const query = `UPDATE clients SET ? WHERE name = '${name}'`
        const result = await new Promise((resolve, reject) => {
            conn.query(query, client, (err, result, fields) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            });
        })
        return result;
    } catch (error) {
        console.log('Error menjalankan query: ', error)
    }
}

// QUERY COUNT TABLE CLIENTS
const clientLength = async () => {
    try {
        const query = `SELECT COUNT(name) AS length FROM clients`
        const result = await new Promise((resolve, reject) => {
            conn.query(query, (err, result, fields) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            });
        })
        return result;
    } catch (error) {
        console.log('Error menjalankan query: ', error)
    }
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

    insert(newClient)

    client.initialize()

    client.on('qr', async (qr) => {
        const qr_url = await qrcode.toDataURL(qr);

        const updateClient = {
            qrcode: qr_url,
            status: "on-qr"
        }

        update(updateClient, clientName)
    })

    client.on('authenticated', async () => {
        const updateStatus = {
            status: "authenticated"
        }
        update(updateStatus, clientName);
    })

    client.on('ready', () => {
        const updateClient = {
            status: "ready",
            clientdata: CircularJSON.stringify(client)
        }

        const clienData = {
            name: clientName,
            clientdata: client
        }

        clients.push(clienData)

        update(updateClient, clientName)
    })

    client.on('message', async (message) => {
        if (message.body === "!ping") {
            message.reply('pong');
        } else if (message.body === "!link") {
            client.sendMessage(message.from, "link: https://wwebjs.dev/")
        } else if (message.body.startsWith("!topup")) {
            const clientFound = await select(clientName)
            if (clientFound[0].foward == 0) {
                client.sendMessage(message.from, "maaf untuk sementara fitur topup belum tersedia")
            } else {
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
                })

                client.sendMessage(message.from, "permintaan sedang diproses")

            }
        }
    })

    client.on('disconnected', (reason) => {
        client.destroy();
    });

}

const newClient = async (req, res) => {
	const errors = validationResult(req)

	if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    } else {

    const clientName = req.body.clientname
    const auth = req.query.auth

    if (auth == secret_key) {
        const clients = await clientLength()
        const ready = await select(clientName)

        if (clients[0].length <= 66  && ready.length === 0) {
            createClient(clientName)
            res.status(200).json({
                status: true,
                message: `Client ${clientName} successfully created`
            })
        } else if (ready.length === 1) {
            res.status(400).json({
                status: false,
                message: `Client with name ${clientName} already, please insert another name!`
            })
        } else {
            res.status(400).json({
                status: false,
                message: `clients is full, please delete some client first`
            })
        }
    } else {
        res.status(401).json({
            status: false,
            message: `unauthorized`
        })
    }
	}
}

const getQRCode = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    } else {
        const clientname = req.body.clientname
        const auth = req.query.auth

        if (auth == secret_key) {
            const clientFound = await select(clientname)

            if (clientFound.length === 0) {
                res.status(400).json({
                    status: false,
                    message: `client with name ${clientname} not found!`
                })
            } else {
                res.status(200).json({
                    status: true,
                    qr_code: clientFound[0].qrcode
                })
            }
        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
        }
    }
}

const getStatus = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    } else {
        const auth = req.query.auth

        if (auth == secret_key) {
            const clientname = req.body.clientname
            const clientFound = await select(clientname)

            if (clientFound.length === 0) {
                res.status(400).json({
                    status: false,
                    message: `client with name ${clientname} not found!`
                })
            } else {
                res.status(200).json({
                    status: true,
                    client_status: clientFound[0].status
                })
            }
        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
        }
    }
}

const sendMessage = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    } else {
        const auth = req.query.auth;
        if (auth === secret_key) {
            const clientname = req.body.clientname;
            let sendto = req.body.sendto;
            const message = req.body.message;

            var phoneFormat = '@c.us'
            const phoneNumber = sendto.concat(phoneFormat)

            const clientFound = await select(clientname)
            if (clientFound.length === 0) {
                res.status(400).json({
                    status: false,
                    message: `client with name ${clientname} not found!`
                })
            } else if(clientFound[0].status !== "ready") {
		res.status(400).json({
                    status: false,
                    message: `please login first! get qr code and generate in website.`
                })
		}
		else {
                const client = await clients.find(c => c.name == clientname).clientdata

                client.sendMessage(phoneNumber, message).then(response => {
                    res.status(200).json({
                        status: true,
                        message: `success send message to ${sendto}.`,
                        response: response
                    })
                }).catch(err => {
                    res.status(500).json({
                        status: false,
                        message: `can't send message.`,
                        error: err
                    });
                })
            }
        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
        }
    }

}

const sendMedia = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    } else {
        const auth = req.query.auth;
        if (auth == secret_key) {
            const clientname = req.body.clientname;
            let sendto = req.body.sendto;
            const caption = req.body.caption;
            const file = req.files.file;


            const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name)

            var phoneFormat = '@c.us'
            const phoneNumber = sendto.concat(phoneFormat)

            const clientFound = await select(clientname)

            if (clientFound.length === 0) {
                res.status(400).json({
                    status: false,
                    message: `client with name ${clientname} not found!`
                })
            } else if(clientFound[0].status !== "ready") {
                res.status(400).json({
                    status: false,
                    message: `please login first! get qr code and generate in website.`
                })
	    } else {
                const client = await clients.find(c => c.name == clientname).clientdata

                client.sendMessage(phoneNumber, media, { caption: caption }).then(response => {
                    res.status(200).json({
                        status: true,
                        message: `success send media to ${sendto}.`,
                        response: response
                    })
                }).catch(err => {
                    res.status(500).json({
                        status: false,
                        message: `can't send media.`,
                        error: err
                    });
                })
            }


        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
        }
    }
}

const sendButton = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    } else {
        const auth = req.query.auth;
        if (auth == secret_key) {
            const clientname = req.body.clientname;
            let sendto = req.body.sendto;
            const body = req.body.body;
            const bt1 = req.body.button_1;
            const bt2 = req.body.button_2;
            const bt3 = req.body.button_3;
            const title = req.body.title;
            const footer = req.body.footer;

            const newButton = new Buttons(body, [{ body: bt1 }, { body: bt2 }, { body: bt3 }], title, footer);

            var phoneFormat = '@c.us'
            const phoneNumber = sendto.concat(phoneFormat)

            const clientFound = await select(clientname)

            if (clientFound.length === 0) {
                res.status(400).json({
                    status: false,
                    message: `client with name ${clientname} not found!`
                })
            } else if(clientFound[0].status !== "ready") {
                res.status(400).json({
                    status: false,
                    message: `please login first! get qr code and generate in website.`
                })
	    } else {
                const client = await clients.find(c => c.name == clientname).clientdata

                client.sendMessage(phoneNumber, newButton).then(response => {
                    res.status(200).json({
                        status: true,
                        message: `success send button to ${sendto}.`,
                        response: response
                    })
                }).catch(err => {
                    res.status(500).json({
                        status: false,
                        message: `can't send media.`,
                        error: err
                    });
                })
            }

        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
        }
    }
}

const setStatus = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {
        const auth = req.query.auth;
        if (auth == secret_key) {
            const clientname = req.body.clientname;
            let newstatus = req.body.newstatus;

            const clientData = await clients.find(c => c.name == clientname)

	if (!clientData){
		res.status(400).json({status: false, message:`client with name ${clientname} not found!`})
	} else {
		const client = clientData.clientdata
            await client.setStatus(newstatus).then(response => {
                res.status(200).json({
                    status: true,
                    message: "Status updated",
                })
            }).catch(err => {
                res.status(500).json({
                    status: false,
                    message: "can't update status",
                    err: err
                })
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

const getPhotoProfile = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {
        const auth = req.query.auth;
        if (auth == secret_key) {
            const clientname = req.body.clientname;
            let sendto = req.body.sendto;

            var phoneFormat = '@c.us'
            const phoneNumber = sendto.concat(phoneFormat)

            const clientFound = await select(clientname)
            if (clientFound.length === 0) {
                res.status(400).json({
                    status: false,
                    message: `client with name ${clientname} not found!`
                })
            } else if(clientFound[0].status !== "ready") {
                res.status(400).json({
                    status: false,
                    message: `please login first! get qr code and generate in website.`
                })
            } else {
                const client = await clients.find(c => c.name == clientname).clientdata

                const profileUrl = await client.getProfilePicUrl(phoneNumber)

                res.status(200).json({
                    status: true,
                    message: "success get photo profile",
                    profil_url: profileUrl
                })
            }

        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
        }
    }
}

const changeFowardSetting = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: false,
            errors: errors.array()
        });
    } else {
        const auth = req.query.auth;
        if (auth == secret_key) {
            const clientname = req.body.clientname;
            const fowardSetting = req.body.setting;

            if (fowardSetting) {
                const clientFound = await select(clientname)

                if (clientFound.length === 0) {
                    res.status(400).json({
                        status: false,
                        message: `client with name ${clientname} not found!`
                    })
                } else if(clientFound[0].status !== "ready") {
                res.status(400).json({
                    status: false,
                    message: `please login first! get qr code and generate in website.`
                })
                } 
		else {
                    const foward = {
                        foward: 1
                    }
                    await update(foward, clientname)

                    res.status(200).json({
                        status: true,
                        message: 'foward setting changed successfully.'
                    })
                }
            } else {
                const clientFound = await select(clientname)

                if (clientFound.length === 0) {
                    res.status(400).json({
                        status: false,
                        message: `client with name ${clientname} not found!`
                    })
                } else if(clientFound[0].status !== "ready") {
                res.status(400).json({
                    status: false,
                    message: `please login first! get qr code and generate in website.`
                })
                }
		 else {
                    const foward = {
                        foward: 0
                    }
                    await update(foward, clientname)

                    res.status(200).json({
                        status: true,
                        message: 'foward setting changed successfully.'
                    })
                }
            }
        } else {
            res.status(401).json({
                status: false,
                message: `unauthorized`
            })
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
