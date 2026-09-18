const totalPairs = 8;
const board = document.getElementById('board');
const movesValue = document.getElementById('movesValue');
const pairsValue = document.getElementById('pairsValue');
const scoreValue = document.getElementById('scoreValue');
const statusBanner = document.getElementById('statusBanner');
const teamLabel = document.getElementById('teamLabel');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const overlayDetail = document.getElementById('overlayDetail');

// Round 1 is played by ONLY ONE PLAYER per team. The team_id is the only thing
// pulled from the URL. We do NOT consult /api/games/status, nor any pre-existing
// team "solved" flag, because that would block a single player from playing
// even if a teammate already submitted a score.
const teamId = new URLSearchParams(window.location.search).get('teamId') || 'TEAM123';
const playerSlot = 'game1';

const symbols = ['🍎', '⭐', '🌙', '☀️', '🎯', '⚡', '💎', '🎲'];
let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let moves = 0;
let gameStartedAt = Date.now();
let solvedSubmitted = false;

teamLabel.textContent = teamId;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const deck = shuffle([...symbols, ...symbols]);
  return deck.map((symbol, index) => ({
    id: index,
    symbol,
    matched: false
  }));
}

function updateStats() {
  movesValue.textContent = String(moves);
  pairsValue.textContent = `${matchedPairs} / ${totalPairs}`;
  scoreValue.textContent = String(calculateScore());
}

function calculateScore() {
  const baseScore = 1000;
  const movePenalty = moves * 12;
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - gameStartedAt) / 1000));
  const timePenalty = elapsedSeconds * 2;
  const score = baseScore - movePenalty - timePenalty;
  return Math.max(0, score);
}

function setStatus(message) {
  statusBanner.textContent = message;
}

function createCardElement(card) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  button.dataset.id = String(card.id);
  button.setAttribute('aria-label', 'Hidden memory card');

  const back = document.createElement('span');
  back.className = 'card-face card-back';
  back.textContent = '?';

  const front = document.createElement('span');
  front.className = 'card-face card-front';
  front.textContent = card.symbol;

  button.appendChild(back);
  button.appendChild(front);
  button.addEventListener('click', () => handleCardClick(button, card));

  return button;
}

function initializeGame() {
  cards = buildDeck();
  board.innerHTML = '';
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  moves = 0;
  solvedSubmitted = false;
  gameStartedAt = Date.now();

  cards.forEach((card) => {
    const element = createCardElement(card);
    board.appendChild(element);
  });

  updateStats();
  setStatus('Find all matching pairs.');
  hideOverlay();
}

function revealCard(cardElement) {
  cardElement.classList.add('revealed');
  cardElement.disabled = true;
}

function hideCard(cardElement) {
  cardElement.classList.remove('revealed');
  cardElement.disabled = false;
}

function markMatched(cardElement) {
  cardElement.classList.add('matched', 'disabled');
  cardElement.disabled = true;
}

function isCardMatch(first, second) {
  return first.symbol === second.symbol;
}

function updateCardState(cardElement, card) {
  if (card.matched) {
    markMatched(cardElement);
    return;
  }

  if (firstCard && secondCard) {
    return;
  }

  revealCard(cardElement);
}

function handleCardClick(cardElement, card) {
  if (lockBoard) {
    return;
  }

  if (card.matched || cardElement.classList.contains('revealed')) {
    return;
  }

  if (firstCard && firstCard.id === card.id) {
    return;
  }

  if (secondCard) {
    return;
  }

  revealCard(cardElement);

  if (!firstCard) {
    firstCard = { ...card, element: cardElement };
    return;
  }

  secondCard = { ...card, element: cardElement };
  moves += 1;
  updateStats();
  lockBoard = true;

  setTimeout(() => {
    const isMatch = isCardMatch(firstCard, secondCard);

    if (isMatch) {
      handleMatch();
    } else {
      handleMismatch();
    }
  }, 400);
}

function handleMatch() {
  const matchedCardIds = [firstCard.id, secondCard.id];

  cards = cards.map((card) => {
    if (matchedCardIds.includes(card.id)) {
      return { ...card, matched: true };
    }
    return card;
  });

  matchedPairs += 1;
  markMatched(firstCard.element);
  markMatched(secondCard.element);
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  updateStats();

  if (matchedPairs === totalPairs) {
    finishGame();
    return;
  }

  setStatus('Nice match! Keep going.');
}

function handleMismatch() {
  hideCard(firstCard.element);
  hideCard(secondCard.element);
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  setStatus('Not a match. Try again.');
}

function showOverlay(title, message, detail) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayDetail.textContent = detail;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function lockGameBoard() {
  lockBoard = true;
  document.querySelectorAll('.card').forEach((cardElement) => {
    cardElement.disabled = true;
  });
}

async function submitSolve() {
  if (solvedSubmitted) {
    return;
  }

  solvedSubmitted = true;
  const finalScore = calculateScore();
  const payload = {
    teamId,
    playerSlot,
    score: finalScore,
    completedAt: new Date().toISOString()
  };

  try {
    const response = await fetch('/api/games/solve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Unable to submit solve result.');
    }

    setStatus('Puzzle solved and submitted.');
    showOverlay(
      'ROUND 1 COMPLETE',
      'Your Score: ' + finalScore,
      'Score added to your team scoreboard.'
    );
  } catch (error) {
    solvedSubmitted = false;
    setStatus('Submit failed. Please retry.');
    showOverlay(
      'SUBMISSION FAILED',
      'Your score could not be saved.',
      'Please retry. Your score was not recorded yet.'
    );
    console.error('Submit solve failed:', error);
  }
}

function finishGame() {
  const finalScore = calculateScore();
  lockBoard = true;
  setStatus('Completed. Sending final team result.');
  submitSolve();
}

initializeGame();
