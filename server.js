const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/controle', (req, res) => res.sendFile(__dirname + '/controle.html'));

const lobby = { tanque1: null, tanque2: null, tanque3: null, tanque4: null };

// Sem cidade, com xeriftech
const mapas = ['deserto', 'floresta', 'espacial', 'vulcao', 'xeriftech'];

function gerarObstaculos(mapa) {
  const obstaculos = [];
  const quantidade = 10 + Math.floor(Math.random() * 5);

  // Posições proibidas — arena 800x650
  const proibidas = [
    { x: 30,  y: 30  },
    { x: 722, y: 30  },
    { x: 30,  y: 572 },
    { x: 722, y: 572 }
  ];

  let tentativas = 0;
  while (obstaculos.length < quantidade && tentativas < 300) {
    tentativas++;
    const x = 60 + Math.floor(Math.random() * 680);
    const y = 60 + Math.floor(Math.random() * 530);

    const colideTanque = proibidas.some(p =>
      Math.abs(p.x - x) < 100 && Math.abs(p.y - y) < 100
    );
    const colideObstaculo = obstaculos.some(o =>
      Math.abs(o.x - x) < 70 && Math.abs(o.y - y) < 70
    );

    if (!colideTanque && !colideObstaculo) {
      obstaculos.push({ x, y, w: 48, h: 48 });
    }
  }
  return obstaculos;
}

function gerarPowerUps() {
  const tipos = ['vida', 'rapido', 'escudo'];
  return tipos.map((tipo, i) => ({
    id: i, tipo,
    x: 150 + Math.floor(Math.random() * 500),
    y: 100 + Math.floor(Math.random() * 450),
    ativo: true
  }));
}

let mapaAtual = null;
let obstaculosAtuais = [];
let powerUpsAtuais = [];

io.on('connection', (socket) => {
  console.log('Alguém conectou!');
  socket.emit('lobby-atualizado', lobby);

  socket.on('jogador-entrou', (data) => {
    const { apelido, tanque } = data;
    if (lobby[tanque] && lobby[tanque] !== apelido) {
      socket.emit('vaga-ocupada', tanque); return;
    }
    for (const t in lobby) if (lobby[t] === apelido) lobby[t] = null;
    lobby[tanque] = apelido;
    socket.tanque = tanque;
    socket.apelido = apelido;
    console.log(`${apelido} entrou como ${tanque}`);
    io.emit('lobby-atualizado', lobby);
  });

  socket.on('iniciar-jogo', () => {
    mapaAtual = mapas[Math.floor(Math.random() * mapas.length)];
    obstaculosAtuais = gerarObstaculos(mapaAtual);
    powerUpsAtuais = gerarPowerUps();
    console.log(`Jogo iniciado! Mapa: ${mapaAtual}`);
    io.emit('jogo-iniciado', { mapa: mapaAtual, obstaculos: obstaculosAtuais, powerups: powerUpsAtuais });
  });

  socket.on('revanche', () => {
    mapaAtual = mapas[Math.floor(Math.random() * mapas.length)];
    obstaculosAtuais = gerarObstaculos(mapaAtual);
    powerUpsAtuais = gerarPowerUps();
    io.emit('revanche', { lobby, mapa: mapaAtual, obstaculos: obstaculosAtuais, powerups: powerUpsAtuais });
  });

  socket.on('nova-partida', () => {
    lobby.tanque1 = null; lobby.tanque2 = null;
    lobby.tanque3 = null; lobby.tanque4 = null;
    io.emit('nova-partida');
  });

  socket.on('powerup-coletado', (data) => io.emit('powerup-coletado', data));
  socket.on('jogador-eliminado', (tanque) => io.emit('jogador-eliminado', tanque));
  socket.on('comando', (data) => io.emit('comando', data));

  socket.on('disconnect', () => {
    if (socket.tanque) {
      lobby[socket.tanque] = null;
      console.log(`${socket.apelido} saiu`);
      io.emit('lobby-atualizado', lobby);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));