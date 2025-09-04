const http = require("http");
const express = require('express');
const WebSocket = require("ws");
const bodyParser = require('body-parser');
const crypto = require("crypto");
const url = require('url');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors({
    origin: '*'
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

const PORT = 2000;
server.listen(PORT, () => {
    console.log(`Lobby service running at port ${PORT}`);
});

// -----------------------
// Helpers
const lobby = require("./room.js");

function generateUUID() {
    return crypto.randomUUID();
}

function checkAccessToken(token) {
    return token != "not allowed";
}

async function startGame(roomId) {
    // send message to gameService
    console.log(`Trying to starting game for room ${roomId}`);
    const dataToSend = {
        roomId: roomId,
    }
    try {
        const response = axios.post(`http://localhost:3000/games/${roomId}/start`, dataToSend);
        console.log(response.data);
        return true;
    } catch (error) {
        console.error("Error starting game:", error);
        return false;
    }
    /*
     axios.post(`http://localhost:3000/games/${roomId}/start`)
        .then(res => console.log(res.data))
        .catch(err => console.error(err));
    */
}
// -----------------------
// TODO: Add status
app.get('/', (req, res) => {
    res.send("Lobby Service");
});

// Create new game
app.post('/games', (req, res) => {
    const receivedData = req.body;
    const accessToken = receivedData.accessToken;

    if (!checkAccessToken(accessToken)) {
        console.log("Unauthorized access - not allowed to create room");
        res.status(401).send();
    } else {
        let uuid = generateUUID();
        uuid = receivedData.gameId ? receivedData.gameId : uuid; // for debug; use given id
        // check no duplicate ID
        const newRoom = new lobby.Room(uuid, 2);
        newRoom.addPlayer(accessToken);
        lobby.rooms.push(newRoom);
        
        console.log(`Generated new Game with UUID: ${uuid}`);
        res.status(201).send({gameId: uuid});
    }

    console.log(lobby.rooms);
});

// Join an existing game
app.post('/games/:gameId/join', (req, res) => {
    const accessToken = req.body.accessToken;
    const gameId = req.params.gameId;
    const room = lobby.findRoom(gameId);

    if (!checkAccessToken(accessToken)) {
        let errorMessage = "Unauthorized access - cannot join room";
        console.log(errorMessage);
        res.status(401).send(errorMessage);
    } else if (!room) {
        let errorMessage = `Cannot find room with ID ${gameId}`;
        console.log(errorMessage);
        res.status(404).send(errorMessage);
    } else if (room.checkRoomFull()) {
        let errorMessage = "Room is full";
        console.log(errorMessage);
        res.status(409).send(errorMessage);
    } else {
        room.addPlayer(accessToken);
        console.log(`Player ${accessToken} joined room ${gameId}`);
        let roomInfo = {
            roomToken: room.gameId,
            gameId: room.gameId,
        };
        res.send(roomInfo);
    }

    console.log(lobby.rooms);
});

// Get room status
/*
app.get('/games/:gameId/status', (req, res) => {
    //const accessToken = req.body.accessToken;
    const gameId = req.params.gameId;
    const room = lobby.findRoom(gameId);

    if (!checkAccessToken(accessToken)) {
        let errorMessage = "Unauthorized access - cannot view room";
        console.log(errorMessage);
        res.status(401).send(errorMessage);
    } else
    
    if (!room) {
        let errorMessage = `Cannot find room with ID ${gameId}`;
        console.log(errorMessage);
        res.status(404).send(errorMessage);
    } else {
        let roomInfo = {
            gameId: room.gameId,
            players: room.players,
            maxPlayers: room.maxPlayers,
        };
        res.send(roomInfo);
    }
});*/

// Websocket stuff
wss.on("connection", (ws, req) => {
    ws.id = generateUUID();
    console.log(`Client Connected to websocket, assigned id ${ws.id}`);

    const queryParams = url.parse(req.url, true).query;
    const roomId = queryParams.roomId;
    const room = lobby.findRoom(roomId);
    let roomInfo = null;
    if (room) {
        roomInfo = {
            type: 'roomInfo',
            gameId: room.gameId,
            players: room.players,
            maxPlayers: room.maxPlayers,
        };
    }

    // need to only send to same room
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(roomInfo));
        }
    });

    // ws.player = { playerId: null, name: null, tableId: null }; ?
    // send(ws, {type:'welcome', msg:'Connected. Send {type:"hello", name:"..."} to begin.'});
    ws.on("message", (data) => {
        try {
            // Parse the incoming data
            const message = JSON.parse(data);
    
            console.log(`Client ${ws.id} sent message:`, message);
    
            // check auth - is it owner?
            if (message.action && message.action === "startGame") {
                if (startGame(room.gameId)) {
                    // notify all players in the room that game is starting
                    console.log("Game is starting with id " + room.gameId);
                    // only for same room
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            let gameStartSignal = {
                                type: 'gameStartSignal',
                            };
                            client.send(JSON.stringify(gameStartSignal));
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Failed to parse message:", data, err);
        }
        // handle messages from client
        // e.g., join room, leave room, send chat, etc.
    });
    
    ws.on("close", () => {
        console.log(`client ${ws.id} disconnected from websocket`)
        // remove player from game
        // handle reconnect
    });
});
