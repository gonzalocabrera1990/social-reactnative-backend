const express = require('express');
const Inbox = require('../models/inbox');
const User = require("../models/users");
const { randomNumber } = require('../helpers/libs');
const inboxRouter = express.Router();
inboxRouter.use(express.json());

const control = {}

control.crearSiguiente = (req, res) => {
    Inbox.findById(req.params.talkId)
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
                        if (inbox !== null) inbox.room = randomRoomNumber();
                        User.findById(req.body.members.userOne)
                            .then(user => {

                                inbox.members.userOne = {
                                    firstname: user.firstname,
                                    lastname: user.lastname,
                                    username: user.username,
                                    image: user.image,
                                    _id: user._id
                                }
                            })
                        User.findById(req.body.members.userTwo)
                            .then(user => {

                                inbox.members.userTwo = {
                                    firstname: user.firstname,
                                    lastname: user.lastname,
                                    username: user.username,
                                    image: user.image,
                                    _id: user._id
                                }
                                inbox.save()
                                    .then(result => {
                                        res.statusCode = 200;
                                        res.setHeader('Content-Type', 'application/json');
                                        res.json(result);
                                    })
                            })

                    })
                    .catch(err => {
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json");
                        res.json({ err: err });
                    });
            }
        });
}

control.crearInicio = (req, res) => {
    Inbox.create(req.body)
        .then((inbox) => {
            if (inbox !== null) inbox.room = randomRoomNumber();
            User.findById(req.body.members.userOne)
                .then(user => {

                    inbox.members.userOne = {
                        firstname: user.firstname,
                        lastname: user.lastname,
                        username: user.username,
                        image: user.image,
                        _id: user._id
                    }
                })
            User.findById(req.body.members.userTwo)
                .then(user => {

                    inbox.members.userTwo = {
                        firstname: user.firstname,
                        lastname: user.lastname,
                        username: user.username,
                        image: user.image,
                        _id: user._id
                    }
                    inbox.save()
                        .then(result => {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.json(result);
                        })
                })

        })
        .catch(err => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.json({ err: err });
        });
}

control.inboxes = (req, res) => {
    Inbox.find({})
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
}

control.talk = (req, res) => {
    Inbox.findById(req.params.talkId)
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
}
module.exports = control;