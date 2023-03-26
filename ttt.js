const n = 3;

// sleep function for robot choice
//https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const Player = (name, type, marker) => {
  let wins = 0, losses = 0, ties = 0;
  return {name, type, marker, wins, losses, ties}
}
const Player1 = Player('Player 1', 'human', 'X');
const Player2 = Player('Player 2', 'human', 'O');
firstPlayer = (Player1.marker === 'X') ? Player1 : Player2;

const difficulty = document.querySelector('#difficulty');

const gameBoard = (() => {

// private
  function _genGridMatrix(grid) {
    let out = [], row = [], i = 0;
    for (item of grid){
        row.push(item);
        if ((i+1) % n === 0){
            out.push(row);
            row = [];
        }
        i += 1;
    }
    return out;
  }
  
  const _listMap = {0: [0, 0], 1: [0, 1], 2: [0, 2], 
    3: [1, 0], 4: [1, 1], 5: [1, 2], 
    6: [2, 0], 7: [2, 1], 8: [2, 2]};


  const _gridCells = document.querySelectorAll(".grid-cell");
  const _gridMatrix = _genGridMatrix(_gridCells);
  let _winnerDetected = false;
  let _draw = false;
  let _robotFirst = false;
  let _filledCounter = 0; // if _filledCounter === n, game is a tie if no winner has been determined
  let _robotChoices = [...Array(n**2).keys()];
  
// public
  const boardSize = n;

  // getters
  const gridCells = () => _gridCells;
  const filledCounter = () => _filledCounter;
  const gridMatrix = () => _gridMatrix;
  const winnerDetected = () => _winnerDetected;
  const robotChoices = () => _robotChoices;
  const draw = () => _draw;
  const robotFirst = () => _robotFirst;

  // setters
  function setFilledCounter(val){
    _filledCounter = val;
  }

  function incrCounter() {
    _filledCounter += 1;
  }

  function setWinnerDetected(status) {
    _winnerDetected = status;
  }

  function setDraw(status) {
    _draw = status;
  }

  function setRobotFirst(status) {
    _robotFirst = status;
  }

  function setRobotChoices (idx=0, reset=false) {
    if (reset) {
      _robotChoices = [...Array(n**2).keys()];
    } else {
      _robotChoices.splice(idx, 1);
    }
  }

  // methods
  function congratWinner(currentPlayer) {
    const loser = (currentPlayer === Player1) ? Player2 : Player1;
    const msg = document.querySelector('#grid-heading');
    msg.classList.add('msg');
    msg.textContent = `${currentPlayer.marker} wins!`;
    loser.losses += 1, currentPlayer.wins += 1;
  }

  function minimax (module, minimize, depth, maxDepth, lastMove) {
    let statusParams = JSON.parse(JSON.stringify(module.getStatusParams()));
    if (statusParams['winnerDetected'] && statusParams['currentMarker'] === 'X') {
      return [lastMove, 10];
    }
    if (statusParams['winnerDetected'] && statusParams['currentMarker'] === 'O') {
      return [lastMove, -10];
    }
    if (statusParams['draw']) {
      return [lastMove, 0];
    }

    let outMove = null;
    let outScore = (minimize) ? 10000 : -10000;

    if (depth <= maxDepth) {
      let idx;
      for (idx = 0; idx < module.remainingCells().length; idx++) {
        let moves = module.remainingCells();
        let move = moves[idx];
        let tempList = JSON.parse(JSON.stringify(module.virtualList()));
        let tempGrid = JSON.parse(JSON.stringify(module.virtualMatrix()));

        let tempDraw = statusParams['draw'];
        let tempWinnerDetected = statusParams['winnerDetected'];
        let tempCurrentMarker = statusParams['currentMarker'];

        let tempBoard = minimaxModule();
        tempBoard.directSetVList(tempList);
        tempBoard.directSetVMatrix(tempGrid);
        tempBoard.setStatusParams(tempDraw, tempWinnerDetected, tempCurrentMarker);

        let [i, j] = _listMap[move];
        tempBoard.placeMarker(i, j);

        let [blank, score] = gameBoard.minimax(tempBoard, !minimize, depth + 1, maxDepth, move);

        if (minimize) {
          if (score < outScore) {
            outScore = score;
            outMove = move;
          }
        } else {
          if (score > outScore) {
            outScore = score;
            outMove = move;
          }
        }
      }
    }
    return [outMove, outScore];
  }


  function robotLogic (robotMarker) {
    let level, robotChoice;

    switch (difficulty.value) {
      case 'Easy':
        level = 1;
        break;
      case 'Medium':
        level = 4;
        break;
      case 'Hard':
        level = 6;
        break;
      case 'Impossibru':
        level = 8;
        break;
    }
    if (_robotFirst) {
      let randomChoices = (level === 8) ? [0, 2, 6, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
      console.log( `randomChoices = ${randomChoices}`);
      const randomIdx = Math.floor(Math.random() * ((randomChoices.length) - 0) + 0);
      robotChoice = randomChoices[randomIdx];
      console.log(`robot goes first; first move is random: robotMove = ${robotChoice}`);
      setRobotFirst(false);
    } else if (level === 1) {
      console.log(`_robotChoices = ${_robotChoices}`);
      robotChoice = _robotChoices[Math.floor(Math.random() * ((_robotChoices.length) - 0) + 0)];
      
    } else {
      let vModule = minimaxModule();
      vModule.setVirtualMatrix(_gridMatrix);
      vModule.setStatusParams(_draw, _winnerDetected, gameController.currentPlayer().marker);
      let minimize = (gameController.currentPlayer().marker === 'X') ? false : true;
      robotChoice =  minimax(vModule, minimize, 0, level, null)[0];
    }
    const cellChoice = document.querySelector(`.grid-cell[data-id="${robotChoice+1}"]`);
    cellChoice.textContent = robotMarker;
    incrCounter();
    _robotChoices.splice(_robotChoices.indexOf(robotChoice), 1);
    gameController.switchMarkers();
    console.log(`winnerDetected = ${_winnerDetected}`);
    if (_winnerDetected){
      congratWinner(gameController.currentPlayer());
    }
  }



  function fillCell (e) {
    if (gameController.currentPlayer().type !== 'human') {
      return;
    }
    const cellIndex = robotChoices().indexOf(+e.target.dataset['id']-1);
    const cellContents = e.target.textContent;
    if (cellContents === '' && !_winnerDetected){
      e.target.textContent = gameController.currentPlayer().marker;
      incrCounter();
      setRobotChoices(cellIndex);
      gameController.switchMarkers();
      if (_winnerDetected){
        congratWinner(gameController.currentPlayer());
        return;
      }
      
    }
  }

  for (cell of _gridCells) {
    cell.addEventListener('click', fillCell);
  }


  return {
    boardSize,
    gridCells,
    gridMatrix,
    winnerDetected,
    robotChoices,
    filledCounter,
    setFilledCounter,
    incrCounter,
    setWinnerDetected,
    setDraw,
    setRobotChoices,
    robotLogic,
    fillCell,
    minimax,
    draw,
    setRobotFirst,
    robotFirst,
  }})()


const minimaxModule = () => { //return index of next move

  const _indexList = [...Array(n**2).keys()];
  
  let _virtualList;
  let _virtualMatrix;


  let _draw, _winnerDetected, 
  _currentMarker, _remainingCells;
  
  // getters

  const virtualList = () => _virtualList;
  const virtualMatrix = () => _virtualMatrix;
  const remainingCells = () => _remainingCells;

  const getStatusParams = () => { 
    return {draw: _draw, 
            winnerDetected: _winnerDetected, 
            currentMarker: _currentMarker};
  
  };
  
  // setters

  function _switchMarker() {
    updatedMarker = (_currentMarker === 'X') ? 'O' : 'X';
    _currentMarker = updatedMarker;
  }

  function _setRemainingCells (inputList) {
    _remainingCells = [];
    for (item of inputList) {
      if (item[0] === '') {
        _remainingCells.push(item[1]);
      }
    }
  }

  function _colCheck (col, grid) {
    let check = grid[0][col][0];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i][col][0] === '' || grid[i][col][0] !== check) {
        return false;
      }}
    return true;
  }

  function _rowCheck (row, grid) {
    let check = grid[row][0][0];
    for (let j = 0; j < grid.length; j++) {
      if (grid[row][j][0] === '' || grid[row][j][0] !== check) {
        return false;
      }}
      return true;
  }

  function _diagCheck (type, grid) {

    let r, c, dr, dc;

    if (type === 0) {
      r = 0, c = 0, dr = 1, dc = 1;
    } else if (type === 1) {
      r = 0, c = 2, dr = 1, dc = -1;
    } else {
      return;
    }

    let check = grid[r][c][0];
    for (let k = 0; k < grid.length; k++) {
      if (grid[r][c][0] === '' || grid[r][c][0] !== check) {
        return false;
      }
      r += dr, c += dc;
    }
    return true;
  }

  function _checkForWinner (grid) {
    for (let k = 0; k < grid.length; k++) {
      if (_rowCheck(k, grid)) {
        return [true, 'row', k];
      }
      if (_colCheck(k, grid)) {
        return [true, 'row', k];
      }
    }
    if (_diagCheck(0, grid)) {
      return [true, 'diag', 0];
    }
    if (_diagCheck(1, grid)) {
      return [true, 'diag', 1];
    }
    return [false, 'no winner', null];
  }





  // public setters

  function setStatusParams (draw, winnerDetected, currentMarker) {
    _draw = draw;
    _winnerDetected = winnerDetected;
    _currentMarker = currentMarker;
  }


  // input gameBoard.gridMatrix()

  function setVirtualMatrix (gridMatrix) {
    _virtualMatrix = [];
    _virtualList = [];
    let idx = 0;
    for (let i = 0; i < gridMatrix.length; i++){
      let row = [];
      for (let j = 0; j < gridMatrix.length; j++){
          row.push([gridMatrix[i][j].textContent, idx]);
          idx += 1;
      }
      _virtualList = [..._virtualList, ...row];
      _virtualMatrix.push(row);
    }

    _setRemainingCells(_virtualList);
  }

  function directSetVMatrix (inputMatrix) {
    _virtualMatrix = inputMatrix;
  }

  function directSetVList (inputList) {
    _virtualList = inputList;
    _setRemainingCells(_virtualList);
  }

  function placeMarker(row, column) {
    if (_winnerDetected || (_remainingCells.length === 0 && !_winnerDetected)) {
      return
    }
    if (_virtualMatrix[row][column][0] === '' && !_winnerDetected) {
      _virtualMatrix[row][column][0] = _currentMarker;
      _virtualList[_virtualMatrix[row][column][1]][0] = _currentMarker;
      _setRemainingCells(_virtualList);
      winnerCheck = _checkForWinner(_virtualMatrix);
      if (winnerCheck[0] === true) {
        _winnerDetected = true;
        return;
      }
      if (_remainingCells.length === 0 && !_winnerDetected) {
        _draw = true;
        return;
      }
      _switchMarker();
    }
  }

  function displayGrid () {
    for (let i = 0; i < _virtualMatrix.length; i++) {
      let row = [];
      for (let j = 0; j < _virtualMatrix.length; j++) {
        row.push(_virtualMatrix[i][j][0]);
      }
      console.log(row);
    }
  }



  return {virtualList, 
          virtualMatrix,
          directSetVList,
          directSetVMatrix, 
          getStatusParams,
          setVirtualMatrix, 
          remainingCells, 
          setStatusParams,
          placeMarker,
          displayGrid,
        };
}

// let vModule = minimaxModule();
// vModule.setVirtualMatrix(gameBoard.gridMatrix());
// vModule.setStatusParams(gameBoard.draw(), gameBoard.winnerDetected(), gameController.currentPlayer().marker);
// let minimize = (gameController.currentPlayer().marker === 'X') ? false : true;
// vModule._checkForWinner(vModule.virtualMatrix())




const gameController = (() => {

//private
  const _clearBtn = document.querySelector('#clear');
  let _currentPlayer = firstPlayer;
  

  function clearBoard () {
    const removeMsg = document.querySelector('#grid-heading');
    gameBoard.setDraw(false);
    gameBoard.setWinnerDetected(false);
    gameBoard.setRobotChoices(0, true);
    for (cell of gameBoard.gridCells()){
      cell.textContent = '';
      gameBoard.setFilledCounter(0);
      _currentPlayer = firstPlayer;
    }
    if (removeMsg) {
      removeMsg.classList.remove('msg');
      removeMsg.textContent = 'Tic-Tac-Toe';
    }
    if (firstPlayer.type === 'robot') {
      gameBoard.setRobotFirst(true);
      console.log(`robotFirst = ${gameBoard.robotFirst()}`);
      setTimeout(() => {gameBoard.robotLogic(firstPlayer.marker);}, 100);
    }
  }


  _clearBtn.addEventListener('click', () => clearBoard());


//public
  // getters
  const currentPlayer = () => _currentPlayer;

  // setters
  const setCurrentPlayer = () => {
    _currentPlayer = firstPlayer;
  }

  // methods
  function rowChecker(row) {
    let currentCell = gameBoard.gridMatrix()[row][0].textContent;
    let check;
    for (let j = 0; j < gameBoard.boardSize; j++){
      check = gameBoard.gridMatrix()[row][j].textContent;
      if ( check !== currentCell || check === ''){
        return;
      }}
    // if not returned after for loop, winner is detected
    gameBoard.setWinnerDetected(true);
  }

  function colChecker(col) {
    let currentCell = gameBoard.gridMatrix()[0][col].textContent;
    let check;
    for (let i = 0; i < gameBoard.boardSize; i++){
      check = gameBoard.gridMatrix()[i][col].textContent;
      if (check !== currentCell || check === ''){
        return;
      }}
    // if not returned after for loop, winner is detected
    gameBoard.setWinnerDetected(true);
  }

  function diagChecker (r, c, type) {
    let [dr, dc] = (type === 0) ? [1, 1] : [1, -1];

    let currentCell = gameBoard.gridMatrix()[r][c].textContent;
    let check;
    for (let idx = 0; idx < gameBoard.boardSize; idx++){
      check = gameBoard.gridMatrix()[r][c].textContent;
      if (check !== currentCell || check === ''){
        return;
      }
      r += dr, c += dc;
    }
    gameBoard.setWinnerDetected(true);
  }

  function boardChecker() {
    // row checker
    for (let row = 0; row < gameBoard.boardSize; row++){
      rowChecker(row);
    }
    // col checker
    for (let col = 0; col < gameBoard.boardSize; col++){
      colChecker(col);
    }

    // diagonal checker
    let [d1r, d1c] = [0, 0];
    let [d2r, d2c] = [0, gameBoard.boardSize-1];
    diagChecker(d1r, d1c, 0);
    diagChecker(d2r, d2c, 1);

    // tie
    if (gameBoard.filledCounter() === (gameBoard.boardSize)**2 && !gameBoard.winnerDetected()){
      const msg = document.querySelector('#grid-heading');
      msg.classList.add('msg');
      msg.textContent = `It's a tie!`;
      gameBoard.setDraw(true);
      Player1.ties += 1, Player2.ties += 1;
      return;
    }
  }

  async function switchMarkers() {
    boardChecker();
    if (gameBoard.winnerDetected()){return;}
    const prevPlayer = _currentPlayer;
    _currentPlayer = (prevPlayer === Player1) ? Player2 : Player1;
    if (_currentPlayer.type === 'robot' && !gameBoard.winnerDetected() && !gameBoard.draw()){
      await sleep(1000);
      gameBoard.robotLogic(_currentPlayer.marker);
    }
  }

  return {
    currentPlayer,
    switchMarkers,
    clearBoard,
    setCurrentPlayer,
  }
})()


// DOM Design 


// modal menu
let startFlag = true;

const icon = document.querySelector('.fa');
const form = document.querySelector('.menu');
const closeBtn = document.querySelector('.close');
const modal = document.querySelector('.modal');
const modalCanvas = document.querySelector('.modal-canvas');

icon.onclick = function () {
  modalCanvas.style.display = 'block';
  modal.classList.add('active');
};

// menu options
const matchType = document.querySelector('#matchType');
const playerChoice = document.querySelector('#playerChoice');

const modalTitle = document.querySelector('#modal-title')
const welcomeMsg = document.querySelector('#welcome-msg');
const playerOneName = document.querySelector('#playeroneName')
const playerTwoName = document.querySelector('#playertwoName')

let currentMatchType = 'Player vs. Player';
let currentChoice = 'X';
let currentDifficulty = 'Easy';
let currentp1Name = 'Player 1';
let currentp2Name = 'Player 2';

const matchConditions = () => {
  if (matchType.value === 'Player vs. Computer'){
    playerChoice.disabled = false;
    difficulty.disabled = false;
  } else if (matchType.value === 'Player vs. Player') {
    playerChoice.disabled = true;
    difficulty.disabled = true;
  }
};


closeBtn.onclick = function () {
  if (!startFlag){
    matchType.value = currentMatchType;
    playerChoice.value = currentChoice;
    difficulty.value = currentDifficulty;
    playerOneName.value = Player1.name
    playerTwoName.value = Player2.name
    matchConditions();
    modal.classList.remove('active');
    modalCanvas.style.display = 'none';
  }
  return false;
};


matchType.addEventListener('change', 
    (e) => {
      e.preventDefault();
      matchConditions();
    });




// sidenav

function openNav() {
  document.getElementById("mySidenav").style.width = "400px";
  modalCanvas.style.display = 'block';
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  modalCanvas.style.display = 'none';
}

const clearBtn = document.querySelector('#clear');
const p1ScoreDetails = document.querySelector('.p1ScoreDetails')
const p1ScoreHeader = document.querySelector('#playeroneScore-heading')

const p2ScoreDetails = document.querySelector('.p2ScoreDetails')
const p2ScoreHeader = document.querySelector('#playertwoScore-heading')
const resetScores = document.querySelector('#resetScores');



function setScores(){
  p1ScoreDetails.innerHTML =
  `<p>Wins: ${Player1.wins}</p>
  <p>Losses: ${Player1.losses}</p>
  <p>Ties: ${Player1.ties}</p>`;

  p2ScoreDetails.innerHTML =
  `<p>Wins: ${Player2.wins}</p>
  <p>Losses: ${Player2.losses}</p>
  <p>Ties: ${Player2.ties}</p>`;
}

function resetScoresf() {
  Player1.wins = 0;
  Player1.losses = 0;
  Player1.ties = 0;

  Player2.wins = 0;
  Player2.losses = 0;
  Player2.ties = 0;

  setScores();
}

resetScores.addEventListener('click', resetScoresf);
clearBtn.addEventListener('click', setScores)



form.addEventListener('submit', 
    (e) => {
      e.preventDefault();

      welcomeMsg.hidden = true;
      closeBtn.hidden = false;
      if (matchType.value === 'Player vs. Computer'){
        Player1.marker = playerChoice.value;
        Player2.type = 'robot';
        Player2.marker = (Player1.marker === 'X') ? 'O' : 'X';
        currentMatchType = 'Player vs. Computer';
      } else if (matchType.value === 'Player vs. Player'){
        Player2.type = 'human';
        currentMatchType = 'Player vs. Player';
      }
      modal.classList.remove('active');
      modalCanvas.style.display = 'none';

      if (!startFlag){
        firstPlayer = (Player1.marker === 'X') ? Player1 : Player2;
        gameController.clearBoard();
      }

      Player1.name = playerOneName.value;
      Player2.name = playerTwoName.value;
      
      resetScoresf();

      p1ScoreHeader.textContent = `${Player1.name}`;
      p2ScoreHeader.textContent = `${Player2.name}`;

      p1ScoreDetails.innerHTML =
      `<p>Wins: ${Player1.wins}</p>
      <p>Losses: ${Player1.losses}</p>
      <p>Ties: ${Player1.ties}</p>`;
    
      p2ScoreDetails.innerHTML =
      `<p>Wins: ${Player2.wins}</p>
      <p>Losses: ${Player2.losses}</p>
      <p>Ties: ${Player2.ties}</p>`;
      

      if (startFlag){
        modalTitle.textContent = "Settings";
        firstPlayer = (Player1.marker === 'X') ? Player1 : Player2;
        gameController.setCurrentPlayer();
        startFlag = false;
        if (firstPlayer.type === 'robot') {
          console.log('first player is robot');
          //gameBoard.robotLogic(firstPlayer.marker);
          gameBoard.setRobotFirst(true);
          console.log(`robotFirst = ${gameBoard.robotFirst()}`);
          setTimeout(() => {gameBoard.robotLogic(firstPlayer.marker);}, 50);
        }
      }
    })
