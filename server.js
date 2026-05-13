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

const mapas = ['deserto', 'floresta', 'espacial', 'cidade', 'vulcao'];

function gerarObstaculos(mapa) {
  const obstaculos = [];
  const quantidade = 12 + Math.floor(Math.random() * 6); // 12 a 17 obstáculos

  const tiposObstaculo = {
    deserto:  ['🪨', '🌵', '🪨'],
    floresta: ['🌲', '🌳', '🪨'],
    espacial: ['🪐', '☄️', '🛸'],
    cidade:   ['🏢', '🚧', '🪣'],
    vulcao:   ['🪨', '🔥', '🌋']
  };

  const tipos = tiposObstaculo[mapa];

  // Posições proibidas (onde os tanques começam) — arena 1400x700
  const proibidas = [
    { x: 60,   y: 300 },
    { x: 1292, y: 300 },
    { x: 60,   y: 500 },
    { x: 1292, y: 500 }
  ];

  let tentativas = 0;
  while (obstaculos.length < quantidade && tentativas < 300) {
    tentativas++;
    const x = 80 + Math.floor(Math.random() * 1200);
    const y = 80 + Math.floor(Math.random() * 540);

    const colideTanque = proibidas.some(p =>
      Math.abs(p.x - x) < 120 && Math.abs(p.y - y) < 120
    );

    const colideObstaculo = obstaculos.some(o =>
      Math.abs(o.x - x) < 80 && Math.abs(o.y - y) < 80
    );

    if (!colideTanque && !colideObstaculo) {
      obstaculos.push({
        x, y,
        w: 48, h: 48,
        tipo: tipos[Math.floor(Math.random() * tipos.length)]
      });
    }
  }

  return obstaculos;
}

// Power-ups
function gerarPowerUps() {
  const tipos = ['vida', 'rapido', 'escudo'];
  const powerups = [];
  for (let i = 0; i < 3; i++) {
    powerups.push({
      id: i,
      tipo: tipos[i],
      x: 300 + Math.floor(Math.random() * 800),
      y: 150 + Math.floor(Math.random() * 400),
      ativo: true
    });
  }
  return powerups;
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
      socket.emit('vaga-ocupada', tanque);
      return;
    }

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
    lobby.tanque1 = null;
    lobby.tanque2 = null;
    lobby.tanque3 = null;
    lobby.tanque4 = null;
    io.emit('nova-partida');
  });

  socket.on('powerup-coletado', (data) => {
    io.emit('powerup-coletado', data);
  });

  socket.on('jogador-eliminado', (tanque) => {
    io.emit('jogador-eliminado', tanque);
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