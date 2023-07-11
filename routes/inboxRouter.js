const express = require('express');
const authenticate = require('../authenticate');
const cors = require('./cors');
const User = require('../models/users');
const Inbox = require('../models/inbox');
const { addUser, removeUser, getUser, getUsers, getUserInRooms, usersRoom } = require('../usersSocketIoRooms');
const { saveUser, deleteUser, fetchUser, socketUserConnect } = require('../socketUsers');

const { randomNumber, changeSort, addInboxId } = require('../helpers/libs');

const inboxRouter = express.Router();
inboxRouter.use(express.json());

inboxRouter.route('/send/:talkId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .post(cors.cors, authenticate.verifyUser, (req, res, next) => {
        Inbox.findById(req.params.talkId)
            .populate('members.userOne')
            .populate('members.userTwo')
            .then(inbox => {
                if (inbox !== null) {
                    if (req.body) inbox.talk.push(req.body.talk)

                    inbox.save()
                        .then(inbox => {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.json(inbox);
                        })
                        .catch(err => {
                            res.statusCode = 500;
                            res.setHeader("Content-Type", "application/json");
                            res.json({ err: err });
                        });

                } else {
                    Inbox.create(req.body)
                        .then((inbox) => {
                            if (inbox !== null) {
                                inbox.room = randomNumber(10);
                                inbox.save()
                                    .then(result => {
                                        res.statusCode = 200;
                                        res.setHeader('Content-Type', 'application/json');
                                        res.json(result);
                                    })
                            }

                        })
                        .catch(err => {
                            res.statusCode = 500;
                            res.setHeader("Content-Type", "application/json");
                            res.json({ err: err });
                        });
                }
            });
    })
//if the endpoint send/:talkId cannot load params, it will run /send/ and create a new inbox
inboxRouter.route('/send')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .post(cors.cors, authenticate.verifyUser, (req, res, next) => {
        Inbox.create(req.body)
            .then((inbox) => {
                if (inbox !== null) {
                    inbox.room = randomNumber(10);
                    inbox.save()
                        .then(result => {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.json(result);
                        })
                }
                randomNumber(10);
            })
            .catch(err => {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({ err: err });
            });
    })

inboxRouter.route('/getch/:userId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
        Inbox.find({})
            .populate('members.userOne')
            .populate('members.userTwo')
            .then(inboxOne => {
                const results = inboxOne.filter(inbox => inbox.members.userOne._id == req.params.userId || inbox.members.userTwo._id == req.params.userId)
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(results);
            })
            .catch(err => {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({ err: err });
            });
    })

inboxRouter.route('/getch/talk/:talkId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
        Inbox.findById(req.params.talkId)
            .populate('members.userOne')
            .populate('members.userTwo')
            .then(talk => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(talk);
            })
            .catch(err => {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({ err: err });
            });
    })

module.exports = {
    routerInd: inboxRouter,
    start: function (io) {
        io.on('connection', function (socket) {
            console.log("Connecting socket")
            socket.on('probando', (data) => {
                console.log(data)
            });
            //event: save user data in connected array
            socket.on('username', (data) => {
                const usuario = saveUser({
                    id: data.id,
                    name: data.name,
                    socketId: socket.id
                })
                let clean = removeUser(data.id)
            });

            socket.on('usernameAngular', (data) => {
                const usuario = saveUser({
                    id: data.id,
                    name: data.name,
                    socketId: socket.id
                })
                let clean = removeUser(data.id)
                socket.emit('returnUsernameAngular', usuario);
            });

            socket.on('create-talk', ({ contenido }) => {
                if (contenido.members.userOne) {
                    Inbox.create(contenido)
                        .then((inbox) => {
                            Inbox.findById(inbox._id)
                                .populate('members.userOne')
                                .populate('members.userTwo')
                                .then((item) => {
                                    if (item !== null) {
                                        item.room = randomNumber(10);
                                        item.save()
                                            .then(rest => {
                                                socket.emit('sendChat', rest);
                                            })
                                    }
                                })
                        })
                }
            })
            //event:search chat and get into that room
            socket.on('fetchChat', ({ query, usuario, room }) => {
                Inbox.findById(query)
                    .populate('members.userOne')
                    .populate('members.userTwo')
                    .then(inboxOne => {
                        if (inboxOne) {
                            //event: save user data in array room
                            const { user } = addUser({ id: usuario, name: query, room })
                            inboxOne.talk.map(item => {
                                if (item.author != usuario && !item.seen) {
                                    item.seen = true
                                }
                            })
                        }
                        inboxOne.save()
                            .then(result => {
                                socket.join(room)
                                socket.emit('getChat', result);
                            })
                    })
            })

            //event: send message
            socket.on('sendMessage', ({ contenido, talkId, roomSocket }) => {
                let emisor = contenido.talk.author
                let receptor = emisor == contenido.members.userOne ? contenido.members.userTwo : contenido.members.userOne
                let socketReceptor = fetchUser(receptor);
                let roomReceptor = getUser(receptor);
                let roomEmisor = getUser(emisor);
                const { user } = addUser({ id: contenido.talk.author, name: contenido.talk.author, room: roomSocket })

                if (!socketReceptor) {
                    if (!talkId) {
                        Inbox.create(contenido)
                            .then((inbox) => {
                                Inbox.findById(inbox._id)
                                    .populate('members.userOne')
                                    .populate('members.userTwo')
                                    .then((item) => {
                                        if (item !== null) {
                                            item.room = randomNumber(10);
                                            item.save()
                                                .then(() => {
                                                    socket.join(item.room)
                                                    //addInboxId(item.members.userOne._id, item.members.userTwo._id, item._id).then(item)
                                                })
                                                // .then(() => {
                                                //     console.log('aaa', item)
                                                //     addInboxId(item.members.userTwo._id, item.members.userOne._id, item._id).then(item)
                                                // })
                                                .then(() => {
                                                    console.log('bbb', item)
                                                    changeSort(item.members.userTwo._id, item.members.userOne._id, item._id)
                                                    return item
                                                })
                                                .then(rest => {
                                                    io.to(rest.room).emit('sendChat', rest);
                                                    return rest
                                                })
                                        }
                                    })
                            })
                    } else {
                        Inbox.findById(talkId)
                            .populate('members.userOne')
                            .populate('members.userTwo')
                            .then(inbox => {
                                if (inbox !== null) {
                                    inbox.talk.push(contenido.talk)
                                    inbox.save()
                                        .then(solve => {
                                            socket.join(solve.room)
                                            return solve
                                        })
                                        .then(() => {
                                            console.log('bbb', inbox)
                                            changeSort(inbox.members.userTwo._id, inbox.members.userOne._id, inbox._id)
                                            return inbox
                                        })
                                        .then(rest => {
                                            io.to(rest.room).emit('sendChat', rest);
                                            return rest
                                        })
                                }
                            })
                    }

                }
                //*************
                else if (socketReceptor && roomReceptor === undefined) {
                    if (!talkId) {
                        Inbox.create(contenido)
                            .then((inbox) => {
                                Inbox.findById(inbox._id)
                                    .populate('members.userOne')
                                    .populate('members.userTwo')
                                    .then((item) => {
                                        if (item !== null) {
                                            item.room = randomNumber(10);
                                            item.save()
                                            .then(() => {
                                                socket.join(item.room)
                                                //addInboxId(item.members.userOne._id, item.members.userTwo._id, item._id).then(item)
                                            })
                                            // .then(() => {
                                            //     console.log('aaa', item)
                                            //     addInboxId(item.members.userTwo._id, item.members.userOne._id, item._id).then(item)
                                            // })
                                            .then(() => {
                                                console.log('bbb', item)
                                                changeSort(item.members.userTwo._id, item.members.userOne._id, item._id)
                                                return item
                                            })
                                                .then(rest => {
                                                    io.to(rest.room).emit('sendChat', rest);
                                                    return rest
                                                })
                                                .then(api => {
                                                    const sock = socketReceptor.socketId
                                                    socket.broadcast.to(sock).emit("chatNotification", api);
                                                    return api
                                                })
                                                .then(() => {
                                                    emisor = ""
                                                    receptor = ""
                                                    socketReceptor = ""
                                                    roomReceptor = ""
                                                    roomEmisor = ""
                                                })
                                        }
                                    })
                            })
                    } else {
                        Inbox.findById(talkId)
                            .populate('members.userOne')
                            .populate('members.userTwo')
                            .then(inbox => {
                                if (inbox !== null) {
                                    let sok = socketReceptor.socketId
                                    inbox.talk.push(contenido.talk)
                                    inbox.save()
                                        .then(sol => {
                                            socket.join(sol.room)
                                            return sol
                                        })
                                        .then(() => {
                                            console.log('bbb', inbox)
                                            changeSort(inbox.members.userTwo._id, inbox.members.userOne._id, inbox._id)
                                            return inbox
                                        })
                                        .then(rest => {
                                            io.to(rest.room).emit('sendChat', rest);
                                            return rest
                                        })
                                        .then(api => {
                                            socket.broadcast.to(sok).emit("chatNotification", api);
                                            return api
                                        })
                                        .then(() => {
                                            emisor = ""
                                            receptor = ""
                                            socketReceptor = ""
                                            roomReceptor = ""
                                            roomEmisor = ""
                                        })
                                }
                            })
                    }
                }
                //*************

                else if (socketReceptor && roomReceptor) {
                    Inbox.findById(talkId)
                        .populate('members.userOne')
                        .populate('members.userTwo')
                        .then(inbox => {
                            if (inbox !== null) {
                                inbox.talk.push(contenido.talk)
                                inbox.talk.map(item => {
                                    if (item.author != emisor && !item.seen) {
                                        item.seen = true
                                    }
                                })
                                inbox.save()
                                    .then(sol => {
                                        socket.join(sol.room)
                                        return sol
                                    })
                                    .then((sol) => {
                                        console.log('bbb', sol)
                                        changeSort(sol.members.userTwo._id, sol.members.userOne._id, sol._id)
                                        return sol
                                    })
                                    .then(rest => {
                                        io.to(rest.room).emit('sendChat', rest);
                                        return rest
                                    })
                            }
                        })
                }
                //*************

                randomNumber(10);
            })
            socket.on('sendMessageAngular', ({ contenido, talkId, roomSocket }) => {
                let emisor = contenido.talk.author
                let receptor = emisor == contenido.members.userOne ? contenido.members.userTwo : contenido.members.userOne
                let socketReceptor = fetchUser(receptor);
                let roomReceptor = getUser(receptor);
                let roomEmisor = getUser(emisor);
                const { user } = addUser({ id: contenido.talk.author, name: contenido.talk.author, room: roomSocket })
                //if user is not connected in the app
                if (!socketReceptor) {
                    Inbox.findById(talkId)
                        .populate('members.userOne')
                        .populate('members.userTwo')
                        .then(inbox => {
                            if (inbox !== null) {
                                inbox.talk.push(contenido.talk)
                                inbox.save()
                                    .then(solve => {
                                        socket.join(solve.room)
                                        return solve
                                    })
                                    .then(rest => {
                                        io.to(rest.room).emit('sendChat', rest);
                                    })
                            }
                        })
                }
                //*************

                //if user is connected in the app, but is not connected in a room
                else if (socketReceptor && roomReceptor === undefined) {
                    Inbox.findById(talkId)
                        .populate('members.userOne')
                        .populate('members.userTwo')
                        .then(inbox => {
                            if (inbox !== null) {
                                let sok = socketReceptor.socketId
                                inbox.talk.push(contenido.talk)
                                inbox.save()
                                    .then(sol => {
                                        socket.join(sol.room)
                                        return sol
                                    })
                                    .then(rest => {
                                        io.to(rest.room).emit('sendChat', rest);
                                        return rest
                                    })
                                    .then(api => {
                                        socket.broadcast.to(sok).emit("chatNotification", api);
                                    })
                                    .then(() => {
                                        emisor = ""
                                        receptor = ""
                                        socketReceptor = ""
                                        roomReceptor = ""
                                        roomEmisor = ""
                                    })
                            }
                        })
                }
                //*************
                //if a user is connected in the app and a room
                else if (socketReceptor && roomReceptor) {
                    Inbox.findById(talkId)
                        .populate('members.userOne')
                        .populate('members.userTwo')
                        .then(inbox => {
                            if (inbox !== null) {
                                inbox.talk.push(contenido.talk)
                                inbox.talk.map(item => {
                                    if (item.author != emisor && !item.seen) {
                                        item.seen = true
                                    }
                                })
                                inbox.save()
                                    .then(sol => {
                                        socket.join(sol.room)
                                        return sol
                                    })
                                    .then(rest => {
                                        io.to(rest.room).emit('sendChat', rest);
                                    })
                            }
                        })
                }
                //*************

                randomNumber(10);
            })


            socket.on('removeuser', (id) => {
                let removido = removeUser(id)
                
                console.log('removido', removido)
            })
            socket.on('removeLogin', (id) => {
                let remove = removeUser(id)
                let removido = deleteUser(id)
                console.log('removido', removido)
            })
            socket.on('disconnect', function (data) {
                console.log('Got disconnect!', data);
            })
        })
    }
};