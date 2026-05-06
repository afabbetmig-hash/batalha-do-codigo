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

io.on('connection', (socket) => {
  console.log('Jogador conectado!');

  socket.on('comando', (data) => {
    io.emit('comando', data);
  });

  socket.on('disconnect', () => {
    console.log('Jogador desconectado.');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});