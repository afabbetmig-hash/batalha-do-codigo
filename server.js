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
  const quantidade = 8 + Math.floor(Math.random() * 5); // 8 a 12 obstáculos

  const tiposObstaculo = {
    deserto:  ['🪨', '🌵', '🪨'],
    floresta: ['🌲', '🌳', '🪨'],
    espacial: ['🪐', '☄️', '🛸'],
    cidade:   ['🏢', '🚧', '🪣'],
    vulcao:   ['🪨', '🔥', '🌋']
  };

  const tipos = tiposObstaculo[mapa];

  // Posições proibidas (onde os tanques começam)
  const proibidas = [
    { x: 50, y: 200 }, { x: 690, y: 200 },
    { x: 50, y: 340 }, { x: 690, y: 340 }
  ];

  let tentativas = 0;
  while (obstaculos.length < quantidade && tentativas < 200) {
    tentativas++;
    const x = 60 + Math.floor(Math.random() * 640);
    const y = 60 + Math.floor(Math.random() * 340);

    // Verifica se não está em cima de um tanque
    const colideTanque = proibidas.some(p =>
      Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < 80
    );

    // Verifica se não está em cima de outro obstáculo
    const colideObstaculo = obstaculos.some(o =>
      Math.abs(o.x - x) < 60 && Math.abs(o.y - y) < 60
    );

    if (!colideTanque && !colideObstaculo) {
      obstaculos.push({
        x, y,
        tipo: tipos[Math.floor(Math.random() * tipos.length)]
      });
    }
  }

  return obstaculos;
}

let mapaAtual = null;
let obstaculosAtuais = [];

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
    // Sorteia mapa e gera obstáculos
    mapaAtual = mapas[Math.floor(Math.random() * mapas.length)];
    obstaculosAtuais = gerarObstaculos(mapaAtual);

    console.log(`Jogo iniciado! Mapa: ${mapaAtual}`);
    io.emit('jogo-iniciado', { mapa: mapaAtual, obstaculos: obstaculosAtuais });
  });

  socket.on('revanche', () => {
    mapaAtual = mapas[Math.floor(Math.random() * mapas.length)];
    obstaculosAtuais = gerarObstaculos(mapaAtual);
    io.emit('revanche', { lobby, mapa: mapaAtual, obstaculos: obstaculosAtuais });
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