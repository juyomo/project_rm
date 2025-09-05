class Players {
    constructor(id) {
        this.character = "unassigned";
        this.wealth = 200;
        this.land = [];
        this.location = 0;
    }

    buyLand(landId) { 
        land.push(landId);
    }
}

class Tile {
    constructor(name, cost) {
        this.name = name;
        this.cost = cost;
    }
}

class Game {
    constructor(id, players) {
        this.id = id;
        this.gameSetup(players);

        // we get passed the list of players (id) from lobbyService
        // and when all of them connect, we start the first turn
    }

    start() {
        console.log("[gameManager] Starting game " + this.id);
        this.currentTurn = 0;
    }

    gameSetup(players) {
        // sets up initial conditions of the game, such as
        // creating map, deciding which player cards are in play, handing out gold to each player, etc.
        this.players = players;
        this.connectedPlayers = [];
        this.help = this.generateHelp();
        this.specialCards = this.generateSpecialCards();
        this.characterCards = this.generateCharacterCards(); // in the order that the turn proceeds
        this.map = this.createMap();
        this.endCounter = 7;
        this.log = [];
        console.log("[gameManager] finished setting up game " + this.id);
        console.log(this);
    }

    generateHelp() {
        return "This is the help text.";
    }

    checkAllConnected() {
        return this.players.length == this.connectedPlayers.length;
        //return this.players.every(p => this.connectedPlayers.includes(p));
    }

    connectPlayer(playerId) {
        if (this.connectedPlayers && !this.connectedPlayers.includes(playerId)) {
            this.connectedPlayers.push(playerId);
        }
    }

    checkEndGame() {
        return this.endCounter <= 0;
    }

    advanceTurn() {
        if (checkEndGame()) {
            console.log("[gameManager] game end");
            return;
        }
        this.endCounter--;
    }

    getPublicState() {
        return {
            map: this.map,
            help: this.help,
            sc: this.specialCards,
            cc: this.characterCards,
            players: this.players,
            connectedPlayers: this.connectedPlayers
            /*players: this.players.map(p => ({
                id: p.id,
                character: p.character,
                landCount: p.land.length,
                wealth: p.wealth
            })),*/
        };
    }

    generateCharacterCards() {
        return ["char1", "char2", "char3", "char4", "char5", "char6"];
    }

    generateSpecialCards() {
        return ["sc1", "sc2", "sc3", "sc4", "sc5", "sc6"];
    }

    createMap() {
        let tiles = [
            new Tile("START", 10000000),
            new Tile("Surrey", 100),
            new Tile("Burnaby", 150),
            new Tile("Busan", 150),
        ];
        return tiles;
    }

    debugPrint() {
        console.log(this);
    }
}

function prepGame(gameId, players) {
    const g1 = new Game(gameId, players);
    games.push(g1);
    return g1;
}

function findGame(gameId) {
    return games.find(g => g.id === gameId);
}

/*
function log(game, message) {
    const timestamp = new Date().toISOString();
    game.log.push(`[${timestamp}] ${message}`);
    console.log(`[Game ${game.id}] ${message}`);
}
*/

// List of all users
// let users = [];

// list of all ongoing games
let games = [];
module.exports = { games, prepGame, findGame, Game };