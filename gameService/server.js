const http = require("http");
const express = require('express');
const WebSocket = require("ws");
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
const url = require('url');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors({
    origin: '*'
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`[GameService] Game service running at port ${PORT}`);
});

// -----------------------
// Helpers
const gameManager = require("./gameManager.js");

function checkAccessToken(token) {
    return token != "not allowed";
}

function generateUUID() {
    return crypto.randomUUID();
}

// -----------------------
app.get('/', (req, res) => {
    res.send("Main page");
});

app.get('/status', (req, res) => {
    res.send("status page");
});

// -----------------------

app.post('/games/:gameId/setup', (req, res) => {
    //const roomToken = req.body.roomToken;
    // only accepts requests from lobbyService
    const gameId = req.params.gameId;
    const players = req.body.players; // array of playerIds
    if (!gameId || !players || !Array.isArray(players) || players.length === 0) {
        return res.status(400).json({ error: "Invalid request body" });
    }
    if (gameManager.findGame(gameId)) {
        return res.status(400).json({ error: "Game already exists" });
    }
    // create game instance
    const game = gameManager.prepGame(gameId, players);
});

wss.on("connection", (ws, req) => {
    ws.id = generateUUID();
    console.log(`[GameService] Client connected to gameService web socket, assigned id: ${ws.id}`);

    const queryParams = url.parse(req.url, true).query;
    const gameId = queryParams.roomId;
    ws.gameId = gameId;
    const playerToken = queryParams.token;

    if (!gameId || !playerToken) {
        console.log("[GameService] Missing gameId or token, closing connection");
        ws.close();
        return;
    }
    if (!checkAccessToken(playerToken)) {
        console.log("[GameService] Invalid access token, closing connection");
        ws.close();
        return;
    }

    const game = gameManager.findGame(gameId);
    
    if (!game) {
        console.log("[GameService] Invalid gameId, closing connection");
        ws.close();
        return;
    }

    console.log(`[GameService] Client joined game ${gameId}`);
    game.connectPlayer(playerToken);
    if (game.checkAllConnected()) {
        broadcastPublicGameState(gameId);
        console.log("[GameService] All players connected, game starting");
        game.start();
    }
    
    ////////
    // ws.player = { playerId: null, name: null, tableId: null }; ?

    /*ws.on("message", (raw) => {
        let msg = null;
        try {
            msg = JSON.parse(raw);
        } catch(e) {
            console.log(e);
            return send(ws, {
                type:'error',
                error:'Invalid JSON',
            });
        }
        console.log(msg);

        try {
            switch (msg.type) {
                case 'rollDice': {
                    console.log("Rolling dice for player:" + msg.player + ws.id);
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(msg.toString());
                        }
                    });
                    break;
                }
                default: {
                    send(ws, {
                        type:'error',
                        error:'Unknown message type',
                    });
                }
            }
        } catch (e) {
            console.log("Error handling message:", e);
            send(ws, {
                type:'error',
                error:'Server error',
            });
        }
    });
*/
    ws.on("close", () => {
        console.log("[GameService] client disconnected " + ws.id);
        // remove player from game
        // handle reconnect
    });
});


function broadcastPublicGameState(gameId) {
    const game = gameManager.findGame(gameId);
    if (!game) return;

    // only to those players..
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'gameState',
                gameId: gameId,
                state: game.getPublicState(),
            }));
        }
    });
}
