const levelConfigs = [
  {
    name: "쉬움",
    rows: 8,
    cols: 8,
    wallRatio: 0.18,
    minPathRatio: 1.0,
  },
  {
    name: "보통",
    rows: 10,
    cols: 10,
    wallRatio: 0.24,
    minPathRatio: 1.1,
  },
  {
    name: "어려움",
    rows: 12,
    cols: 12,
    wallRatio: 0.28,
    minPathRatio: 1.2,
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
  const level = levelConfigs[currentLevelIndex];
  mazeMap = generateMaze(level.rows, level.cols, level.wallRatio, level.minPathRatio);
  goalPos = { r: mazeMap.length - 1, c: mazeMap[0].length - 1 };
  bfsPath = findShortestPathBfs(mazeMap, startPos, goalPos);

  // 예외 상황: 만에 하나 도달 경로가 없는 맵이 생성되면 다시 생성
  if (bfsPath.length === 0) {
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

// 난이도(rows, cols, 벽 비율, 최소 경로 길이 배율)에 맞는 랜덤 미로를 생성한다.
// 시작(S)과 도착(G)은 항상 빈 칸으로 두고, BFS로 도달 가능 여부와
// 최소 경로 길이를 검사해 너무 단순한(직선에 가까운) 맵은 다시 생성한다.
function generateMaze(rows, cols, wallRatio, minPathRatio) {
  const start = { r: 0, c: 0 };
  const goal = { r: rows - 1, c: cols - 1 };

  // 직선 최단 거리(맨해튼 거리) 기준 셀 개수: 우회가 전혀 없을 때의 경로 길이
  const minDirectLength = (rows - 1) + (cols - 1) + 1;
  const minRequiredLength = Math.round(minDirectLength * minPathRatio);

  const maxAttempts = 500;

  // 목표 길이를 만족하지 못하더라도, 도달 가능한 맵 중 가장 우회 경로가
  // 길었던 맵을 보관해 두어 최종 안전장치로 사용한다.
  let bestMap = null;
  let bestPathLength = -1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const map = createRandomMap(rows, cols, wallRatio, start, goal);
    const path = findShortestPathBfs(map, start, goal);

    if (path.length === 0) continue; // 도달 불가능한 맵은 버린다.

    if (path.length >= minRequiredLength) {
      return map;
    }

    if (path.length > bestPathLength) {
      bestPathLength = path.length;
      bestMap = map;
    }
  }

  if (bestMap) return bestMap;

  // 안전장치: 도달 가능한 맵을 전혀 찾지 못한 경우(매우 드묾)
  // 벽이 없는 맵을 반환해 항상 클리어 가능하도록 보장한다.
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

// 시작/도착 칸을 제외한 칸을 wallRatio 확률로 벽(1)으로 채운 무작위 맵을 만든다.
function createRandomMap(rows, cols, wallRatio, start, goal) {
  const map = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const isStart = r === start.r && c === start.c;
      const isGoal = r === goal.r && c === goal.c;
      const isWall = !isStart && !isGoal && Math.random() < wallRatio;
      row.push(isWall ? 1 : 0);
    }
    map.push(row);
  }
  return map;
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

  resultLevelEl.textContent = `${currentLevelIndex + 1} / ${levelConfigs.length} (${levelConfigs[currentLevelIndex].name})`;
  resultTypeEl.textContent = isGiveUp ? "포기" : "클리어";
  playerMovesEl.textContent = String(playerMoves);
  bfsMovesEl.textContent = String(bfsMoves);
  efficiencyScoreEl.textContent = String(efficiencyScore);
  speedScoreEl.textContent = String(speedScore);
  finalScoreEl.textContent = String(finalScore);
  avgScoreEl.textContent = `${avgScore}점`;

  const canMoveNext = !isGiveUp && currentLevelIndex < levelConfigs.length - 1;
  nextLevelBtn.classList.toggle("hidden", !canMoveNext);
  if (!isGiveUp && currentLevelIndex === levelConfigs.length - 1) {
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
  const level = levelConfigs[currentLevelIndex];
  currentLevelEl.textContent = `${currentLevelIndex + 1} / ${levelConfigs.length} (${level.name})`;
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
  if (currentLevelIndex >= levelConfigs.length - 1) return;
  currentLevelIndex += 1;
  moveToGameView();
  initLevel();
});
giveUpBtn.addEventListener("click", () => finishGame(true));
document.addEventListener("keydown", onKeyDown);

initLevel();