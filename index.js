require('rootpath')();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const expressJwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
require('dotenv').config();

const app = express();
// users hardcoded for simplicity, store in a db for production applications
const users = [{ id: 1, username: process.env.TEST_USER, password: process.env.TEST_PASSWD }];

const errorHandler = (err, req, res, next) => {
    if (typeof err === 'string') {
        // custom application error
        return res.status(400).json({ message: err });
    }

    if (err.name === 'UnauthorizedError') {
        // jwt authentication error
        return res.status(401).json({ message: 'Invalid Token' });
    }

    // default to 500 server error
    return res.status(500).json({ message: err.message });
}

const jwt = () => {
    const secret = process.env.SECRET;
    return expressJwt({ secret }).unless({
        path: ['/users/auth']
    });
}

async function authenticate({ username, password }) {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const token = jsonwebtoken.sign({ sub: user.id }, process.env.SECRET);
        const { password, ...userWithoutPassword } = user;
        return {
            ...userWithoutPassword,
            token
        };
    }
}

const router = express.Router();
router.post('/auth', (req, res, next) =>
    authenticate(req.body)
        .then(user => user ? res.json(user) : res.status(400).json({ message: 'Username or password is incorrect' }))
        .catch(err => next(err))
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// use JWT auth to secure the api
app.use(jwt());

// api routes
app.use('/users', router);

// global error handler
app.use(errorHandler);

module.exports = app