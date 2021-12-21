var express = require('express');
var bodyParser = require('body-parser')
var app = express();
const port = process.env.PORT || 3000;

var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');

app.use(express.static('static'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))

// TODO: MONGODB_URI exists for heroku. String exists for running app locally. String should be removed at production.
const dbURI = process.env.MONGODB_URI || "mongodb+srv://dbadmin:dbadmin124@awsfrankfurtcluster0.olqv2.mongodb.net/MessagingAppDB?retryWrites=true&w=majority";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on("error", (err) => { console.error(err) });
db.once("open", () => { console.log("DB started successfully") });

var User = mongoose.model('User', {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    friends: { type: Array, ref: 'User', default: [] },
    keys: { type: Object, unique: true, required: true },
})

var Message = mongoose.model('Message', {
    user: { type: String, required: true },
    userEncMessage: { type: String, required: true },
    receiverEncMessage: { type: String, required: true },
    time: { type: Date, default: Date.now }
})

var Room = mongoose.model('Room', {
    users: { type: Array, default: [], required: true },
    messages: { type: Array, default: [] },
})


app.get('/', (req, res) => {
    res.sendFile("index.html", { root: __dirname });
});

//require crypto library
var crypto = require('crypto');

// generate a keypair for a user using the crypto library
function generateKeyPair(username) {

    var keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        }
    });

    // cipher: 'aes-256-cbc',
    // passphrase: username
    return keyPair;
}


app.post('/login', (req, res) => {
    User.findOne({ username: req.body.username, password: req.body.password }, (err, user) => {
        if (err)
            res.status(500).send("Error");
        else {
            if (user) {
                res.send(user.keys);
            } else {
                var user = new User();
                user.username = req.body.username;
                user.password = req.body.password;
                user.keys = generateKeyPair(req.body.username);
                user.save((err) => {
                    if (err)
                        res.status(500).send("Error");
                    else {
                        res.send(user.keys);
                    }
                });
            }
        }
    });
});

app.get('/room', (req, res) => {
    User.findOne({ username: req.query.receivername }, (err, user) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error");
        } else {
            if (user) {

                Room.findOne({ users: { $all: [req.query.username, req.query.receivername] } }, (err, room) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send("Error");
                    } else {
                        if (!room) {
                            var newRoom = new Room();
                            newRoom.users = [req.query.username, req.query.receivername];
                            newRoom.save((err) => {
                                if (err) {
                                    console.error(err);
                                    res.status(500).send("Error");
                                } else {
                                    res.send({ rid: newRoom._id, publicKey: user.keys.publicKey });
                                }
                            });
                        }
                        else {
                            res.send({ rid: room._id, publicKey: user.keys.publicKey });
                        }
                    }
                });
            } else {
                res.status(500).send("Error");
            }
        }
    });
});

app.get('/messages', (req, res) => {
    Room.findOne({ _id: req.query.roomId }, (err, room) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error");
        } else {
            res.send(room.messages);
        }
    });
});

app.post('/messages', (req, res) => {
    var message = new Message();
    message.user = req.body.username;
    message.userEncMessage = req.body.userEncMessage;
    message.receiverEncMessage = req.body.receiverEncMessage;
    Room.findOne({ _id: req.body.roomId }, (err, room) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error");
        } else {
            room.messages.push(message);
            room.save((err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send("Error");
                } else {
                    io.in(req.body.roomId).emit("message", message);
                    res.send(message);
                }
            });
        }
    });
});

app.get("/friend", (req, res) => {
    User.findOne({ username: req.query.username }, (err, user) => {
        if (err)
            res.status(500).send("Error");
        else {
            User.find({ '_id': { $in: user.friends } }, (err, friends) => {
                if (err)
                    res.status(500).send("Error");
                else {
                    res.send(friends);
                }
            });
        }
    });
});

app.post("/friend", (req, res) => {
    if (req.body.username == req.body.friendname) {
        res.status(500).send("Error");
        return;
    }
    User.findOne({ username: req.body.username }, (err, user) => {
        if (err)
            res.status(500).send("Error");
        else {
            User.findOne({ username: req.body.friendname }, (err, user2) => {
                if (err)
                    res.status(500).send("Error");
                else {
                    if (user2) {
                        if (user.friends.includes(user2._id)) {
                            res.status(500).send("Error");
                            return;
                        }
                        user.friends.push(user2._id);
                        user.save((err) => {
                            if (err)
                                res.status(500).send("Error");
                            else {
                                user2.friends.push(user._id);
                                user2.save((err) => {
                                    if (err)
                                        res.status(500).send("Error");
                                    else {
                                        io.in(user2.username).emit("addfriend", user);
                                        res.sendStatus(200);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        res.status(500).send("Error");
                    }
                }
            });
        }
    });
});

io.on('connection', socket => {
    if (socket.handshake.query.roomId) {
        console.log('A user is connecting to room: ' + socket.handshake.query.roomId);
        socket.join(socket.handshake.query.roomId, function (err) {
            console.log("Rooms after join: ", socket.rooms);
            console.log(err);
        });
    }
    else if (socket.handshake.query.username) {
        console.log('A user is connecting: ' + socket.handshake.query.username);
        socket.join(socket.handshake.query.username, function (err) {
            console.log("Rooms after join: ", socket.rooms);
            console.log(err);
        });
    }
})

io.on('disconnect', socket => {
    console.log('A user is disconnected from' + socket.handshake.query.roomId);
    socket.leave(socket.handshake.query.roomId);
})

var server = http.listen(port, () => {
    console.log(`http://localhost:${server.address().port}`);
});