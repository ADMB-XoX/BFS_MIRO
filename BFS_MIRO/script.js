const levels = [
  {
    name: "쉬움",
    map: [
      [0, 0, 0, 1, 0, 0, 0, 0],
      [1, 1, 0, 1, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0, 1, 0, 1],
      [0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 1, 0],
    ],
  },
  {
    name: "보통",
    map: [
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 1, 0, 1, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 1, 0, 1, 1, 0, 1, 1, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      [1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0, 0, 1, 1, 0],
    ],
  },
  {
    name: "어려움",
    map: [
      [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0],
    ],
  },
];

const startPos = { r: 0, c: 0 };

const gameView = document.getElementById("game-view");
const resultView = document.getElementById("result-view");
const mazeEl = document.getElementById("maze");
const playerMazeEl = document.getElementById("player-maze");
const bfsMazeEl = document.getElementById("bfs-maze");
const currentLevelEl = document.getElementById("current-level");

const moveCountEl = document.getElementById("move-count");
const elapsedTimeEl = document.getElementById("elapsed-time");
const statusMessageEl = document.getElementById("status-message");

const resultLevelEl = document.getElementById("result-level");
const playerMovesEl = document.getElementById("player-moves");
const bfsMovesEl = document.getElementById("bfs-moves");
const efficiencyScoreEl = document.getElementById("efficiency-score");
const speedScoreEl = document.getElementById("speed-score");
const finalScoreEl = document.getElementById("final-score");
const avgScoreEl = document.getElementById("avg-score");
const resultTypeEl = document.getElementById("result-type");

const restartBtn = document.getElementById("restart-btn");
const giveUpBtn = document.getElementById("give-up-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const nextLevelBtn = document.getElementById("next-level-btn");

const directions = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

let playerPos;
let playerPath;
let moveCount;
let gameStartAt;
let timerId;
let gameFinished;
let currentLevelIndex = 0;
let mazeMap = [];
let goalPos = { r: 0, c: 0 };
let bfsPath = [];
let levelScores = [];

function initLevel() {
  const level = levels[currentLevelIndex];
  mazeMap = level.map;
  goalPos = { r: mazeMap.length - 1, c: mazeMap[0].length - 1 };
  bfsPath = findShortestPathBfs(mazeMap, startPos, goalPos);

  // 예외 상황: 레벨 데이터가 잘못되어 도달 경로가 없으면 첫 레벨로 복귀
  if (bfsPath.length === 0) {
    currentLevelIndex = 0;
    initLevel();
    return;
  }

  playerPos = { ...startPos };
  playerPath = [`${startPos.r},${startPos.c}`];
  moveCount = 0;
  gameStartAt = performance.now();
  gameFinished = false;
  statusMessageEl.textContent = "";

  if (timerId) clearInterval(timerId);
  timerId = setInterval(updateTimer, 100);
  updateTimer();
  renderGameMaze();
  updateLevelLabel();
}

function renderGameMaze() {
  renderMaze({
    target: mazeEl,
    showPlayer: true,
    highlightPath: new Set(playerPath),
    highlightBfs: null,
  });
  moveCountEl.textContent = String(moveCount);
}

function renderMaze({ target, showPlayer, highlightPath, highlightBfs }) {
  const rows = mazeMap.length;
  const cols = mazeMap[0].length;
  target.innerHTML = "";
  target.style.gridTemplateColumns = `repeat(${cols}, 34px)`;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = document.createElement("div");
      cell.classList.add("cell");

      if (mazeMap[r][c] === 1) {
        cell.classList.add("wall");
      } else {
        cell.classList.add("floor");
      }

      const key = `${r},${c}`;
      if (highlightPath?.has(key) && !(r === startPos.r && c === startPos.c)) {
        cell.classList.add("player-path");
      }
      if (highlightBfs?.has(key) && !(r === startPos.r && c === startPos.c)) {
        cell.classList.add("bfs-path");
      }

      if (r === startPos.r && c === startPos.c) {
        cell.classList.add("start");
        cell.textContent = "S";
      }
      if (r === goalPos.r && c === goalPos.c) {
        cell.classList.add("goal");
        cell.textContent = "G";
      }

      if (showPlayer && r === playerPos.r && c === playerPos.c) {
        cell.classList.add("player");
        cell.textContent = "P";
      }

      target.appendChild(cell);
    }
  }
}

function updateTimer() {
  if (gameFinished) return;
  const elapsedSec = (performance.now() - gameStartAt) / 1000;
  elapsedTimeEl.textContent = elapsedSec.toFixed(1);
}

function onKeyDown(event) {
  if (gameFinished || !gameView.classList.contains("active")) return;

  const key = event.key.toLowerCase();
  let dr = 0;
  let dc = 0;

  if (key === "arrowup" || key === "w") dr = -1;
  if (key === "arrowdown" || key === "s") dr = 1;
  if (key === "arrowleft" || key === "a") dc = -1;
  if (key === "arrowright" || key === "d") dc = 1;

  if (dr === 0 && dc === 0) return;

  event.preventDefault();
  movePlayer(dr, dc);
}

function movePlayer(dr, dc) {
  const nextR = playerPos.r + dr;
  const nextC = playerPos.c + dc;

  if (!isValidCell(nextR, nextC) || mazeMap[nextR][nextC] === 1) {
    statusMessageEl.textContent = "벽입니다. 다른 길로 이동해보세요.";
    return;
  }

  playerPos = { r: nextR, c: nextC };
  moveCount += 1;
  playerPath.push(`${nextR},${nextC}`);
  statusMessageEl.textContent = "";
  renderGameMaze();

  if (nextR === goalPos.r && nextC === goalPos.c) {
    finishGame(false);
  }
}

function finishGame(isGiveUp) {
  gameFinished = true;
  clearInterval(timerId);

  const elapsedSec = (performance.now() - gameStartAt) / 1000;
  elapsedTimeEl.textContent = elapsedSec.toFixed(1);

  gameView.classList.remove("active");
  resultView.classList.add("active");

  const playerPathSet = new Set(playerPath);
  const bfsPathSet = new Set(bfsPath.map((p) => `${p.r},${p.c}`));

  renderMaze({
    target: playerMazeEl,
    showPlayer: false,
    highlightPath: playerPathSet,
    highlightBfs: null,
  });

  renderMaze({
    target: bfsMazeEl,
    showPlayer: false,
    highlightPath: null,
    highlightBfs: bfsPathSet,
  });

  const bfsMoves = bfsPath.length > 0 ? bfsPath.length - 1 : 0;
  const playerMoves = moveCount;
  const efficiencyScore = calcEfficiencyScore(playerMoves, bfsMoves, isGiveUp);
  const speedScore = calcSpeedScore(elapsedSec, bfsMoves, isGiveUp);
  const finalScore = Math.round(efficiencyScore * 0.7 + speedScore * 0.3);
  levelScores[currentLevelIndex] = finalScore;
  const avgScore = calcAverageScore();

  resultLevelEl.textContent = `${currentLevelIndex + 1} / ${levels.length} (${levels[currentLevelIndex].name})`;
  resultTypeEl.textContent = isGiveUp ? "포기" : "클리어";
  playerMovesEl.textContent = String(playerMoves);
  bfsMovesEl.textContent = String(bfsMoves);
  efficiencyScoreEl.textContent = String(efficiencyScore);
  speedScoreEl.textContent = String(speedScore);
  finalScoreEl.textContent = String(finalScore);
  avgScoreEl.textContent = `${avgScore}점`;

  const canMoveNext = !isGiveUp && currentLevelIndex < levels.length - 1;
  nextLevelBtn.classList.toggle("hidden", !canMoveNext);
  if (!isGiveUp && currentLevelIndex === levels.length - 1) {
    statusMessageEl.textContent = "모든 단계를 클리어했습니다!";
  }
}

function calcEfficiencyScore(playerMoves, bfsMoves, isGiveUp) {
  if (isGiveUp || playerMoves === 0 || bfsMoves === 0) return 0;
  const ratio = bfsMoves / playerMoves;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function calcSpeedScore(elapsedSec, bfsMoves, isGiveUp) {
  if (isGiveUp) return 0;
  const expected = Math.max(4, bfsMoves * 1.2);
  const ratio = expected / Math.max(0.1, elapsedSec);
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function isValidCell(r, c) {
  return r >= 0 && r < mazeMap.length && c >= 0 && c < mazeMap[0].length;
}

function findShortestPathBfs(map, start, goal) {
  const rows = map.length;
  const cols = map[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null));

  const queue = [];
  queue.push(start);
  visited[start.r][start.c] = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current.r === goal.r && current.c === goal.c) {
      return reconstructPath(parent, start, goal);
    }

    for (const { dr, dc } of directions) {
      const nr = current.r + dr;
      const nc = current.c + dc;

      if (
        nr < 0 ||
        nr >= rows ||
        nc < 0 ||
        nc >= cols ||
        visited[nr][nc] ||
        map[nr][nc] === 1
      ) {
        continue;
      }

      visited[nr][nc] = true;
      parent[nr][nc] = current;
      queue.push({ r: nr, c: nc });
    }
  }

  return [];
}

function reconstructPath(parent, start, goal) {
  const path = [];
  let current = goal;

  while (current) {
    path.push(current);
    if (current.r === start.r && current.c === start.c) break;
    current = parent[current.r][current.c];
  }

  path.reverse();
  return path;
}

function updateLevelLabel() {
  const level = levels[currentLevelIndex];
  currentLevelEl.textContent = `${currentLevelIndex + 1} / ${levels.length} (${level.name})`;
}

function calcAverageScore() {
  const scores = levelScores.filter((score) => typeof score === "number");
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round(total / scores.length);
}

function moveToGameView() {
  resultView.classList.remove("active");
  gameView.classList.add("active");
}

restartBtn.addEventListener("click", initLevel);
playAgainBtn.addEventListener("click", () => {
  levelScores = [];
  currentLevelIndex = 0;
  moveToGameView();
  initLevel();
});
nextLevelBtn.addEventListener("click", () => {
  if (currentLevelIndex >= levels.length - 1) return;
  currentLevelIndex += 1;
  moveToGameView();
  initLevel();
});
giveUpBtn.addEventListener("click", () => finishGame(true));
document.addEventListener("keydown", onKeyDown);

initLevel();
