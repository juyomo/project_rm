class Room {
    constructor(gameId, maxPlayers) {
        this.gameId = gameId;
        this.maxPlayers = maxPlayers;
        this.players = [];
    }

    checkRoomFull() {
        return this.players.length >= this.maxPlayers;
    }

    addPlayer(playerId) {
        if (this.checkRoomFull()) {
            throw new Error("Room is full");
        }
        this.players.push(playerId);
    }
}

let rooms = [];

function findRoom(gameId) {
    return rooms.find(room => room.gameId === gameId);
}

module.exports = {
    Room,
    rooms,
    findRoom,
};