const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/controle', (req, res) => {
  res.sendFile(__dirname + '/controle.html');
});

const lobby = {
  tanque1: null,
  tanque2: null,
  tanque3: null,
  tanque4: null
};

io.on('connection', (socket) => {
  console.log('Alguém conectou!');

  socket.emit('lobby-atualizado', lobby);

  socket.on('jogador-entrou', (data) => {
    const { apelido, tanque } = data;

    if (lobby[tanque] && lobby[tanque] !== apelido) {
      socket.emit('vaga-ocupada', tanque);
      return;
    }

    // Remove apelido de outros slots se já estava
    for (const t in lobby) {
      if (lobby[t] === apelido) lobby[t] = null;
    }

    lobby[tanque] = apelido;
    socket.tanque = tanque;
    socket.apelido = apelido;

    console.log(`${apelido} entrou como ${tanque}`);
    io.emit('lobby-atualizado', lobby);
  });

  socket.on('iniciar-jogo', () => {
    console.log('Jogo iniciado!');
    io.emit('jogo-iniciado');
  });

  socket.on('revanche', () => {
    console.log('Revanche!');
    io.emit('revanche', lobby);
  });

  socket.on('nova-partida', () => {
    lobby.tanque1 = null;
    lobby.tanque2 = null;
    lobby.tanque3 = null;
    lobby.tanque4 = null;
    io.emit('nova-partida');
  });

  socket.on('comando', (data) => {
    io.emit('comando', data);
  });

  socket.on('disconnect', () => {
    if (socket.tanque) {
      lobby[socket.tanque] = null;
      console.log(`${socket.apelido} saiu`);
      io.emit('lobby-atualizado', lobby);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});