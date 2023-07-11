const express = require('express');
const cors = require('cors');
const app = express();
const whitelist = ['http://localhost:3000', 'http://localhost:4200', 'https://snack-web-player.s3.us-west-1.amazonaws.com', 'http://localhost:5000', 'https://localhost:5443'];
var corsOptionsDelegate = (req, callback) => {
    var corsOptions;
    if (whitelist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { origin: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);