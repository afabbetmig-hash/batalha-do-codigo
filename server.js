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

// Estado do lobby
const lobby = {
  tanque1: null,
  tanque2: null
};

io.on('connection', (socket) => {
  console.log('Alguém conectou!');

  // Manda o estado atual do lobby pra quem acabou de conectar
  socket.emit('lobby-atualizado', lobby);

  // Jogador entrou no lobby
  socket.on('jogador-entrou', (data) => {
    const { apelido, tanque } = data;

    // Verifica se a vaga já está ocupada
    if (lobby[tanque] && lobby[tanque] !== apelido) {
      socket.emit('vaga-ocupada', tanque);
      return;
    }

    lobby[tanque] = apelido;
    socket.tanque = tanque;
    socket.apelido = apelido;

    console.log(`${apelido} entrou como ${tanque}`);

    // Avisa todo mundo que o lobby mudou
    io.emit('lobby-atualizado', lobby);
  });

  // Iniciar jogo
  socket.on('iniciar-jogo', () => {
    console.log('Jogo iniciado!');
    io.emit('jogo-iniciado');
  });

  // Comandos do jogo
  socket.on('comando', (data) => {
    io.emit('comando', data);
  });

  // Jogador desconectou
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