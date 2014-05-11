// global constant variables
var WEB_WORKER_URL = 'worker.js';
/*  The web worked script will not work when running the code locally.
 *	You can run this on a server to avoid this issue. 
 *	To test on your local machine - try setting up MAMP or similar.
*/

var BLURBS = {
	/*	These blurbs are used for description text.	*/
  'start': {
    header: 'Get Ready',
    blurb: 'Select options then start the game.'
  },
  'p1-turn': {
    header: 'Player 1',
    blurb: 'Click on the board to drop your chip.'
  },
  'p2-turn': {
    header: 'Player 2',
    blurb: 'Click on the board to drop your chip.'
  },
  'ai-turn': {
    header: 'Computer\'s turn',
    blurb: 'The computer just needs a moment to calculate and foil your plans.'
  },
  'p1-win': {
    header: 'Player 1 Wins',
    blurb: 'Victory is not achieved through some secret move, but through many when added together.'
  },
  'p2-win': {
    header: 'Player 2 Wins',
    blurb: 'Ultimate excellence lies not in winning every battle, but in defeating the enemy without ever fighting.'
  },
  'ai-win': {
    header: 'Computer Wins',
    blurb: 'With practice, you shall soon conquer!'
  },
  'tie': {
    header: 'Tie',
    blurb: 'Everybody wins! Well - kind of.'
  }
};





// global variables
var worker;
var currentGameState;
var currentPlayer;


$(function() {
// this code runs once page loads
  $('.start button').on('click', startGame);
  setBlurb('start');
 
  $('#players1').change(function(){showDifficulty(true)});
	
  $('#players2').change(function(){showDifficulty(false)});
  	
  // create worker - the worker controls the game logic
  worker = new Worker(WEB_WORKER_URL);
  worker.addEventListener('message', function(e) {
    switch(e.data.messageType) {
      case 'reset-done':
		currentPlayer = 1
        startHumanTurn();
        break;
      case 'human-move-done':
        endHumanTurn(e.data.coords, e.data.isWin, e.data.winningChips, e.data.isBoardFull);
        break;
      case 'progress':
        updateComputerTurn(e.data.col);
        break;
      case 'computer-move-done':
        endComputerTurn(e.data.coords, e.data.isWin, e.data.winningChips, e.data.isBoardFull,
          e.data.isWinImminent, e.data.isLossImminent);
        break;
    }
  }, false);
});

function showDifficulty(bool){
	if (bool == true){
		$('.dif-options').removeClass('hide'); 
	} 
	else
	{
		$('.dif-options').addClass('hide');
	}
}

function setBlurb(key) {
  $('.info h2').text(BLURBS[key].header);
  $('.info .blurb').text(BLURBS[key].blurb);
}

function startGame() {
  $('.options').addClass('freeze');
  $('.options input').prop('disabled', true);
  $('.lit-cells, .chips').empty();
  
  worker.postMessage({
    messageType: 'reset',
  });
}

function numberOfPlayers(){
	// return integer for number of players
	return parseInt($('input[name=player-options]:checked').val(), 10);
}

function startHumanTurn() {
  setBlurb("p" + currentPlayer + '-turn');
  $('.click-columns div').addClass('hover');
  
  // if mouse is already over a column, show cursor chip there
  var col = $('.click-columns div:hover').index();
  if(col !== -1) {
    createCursorChip(col);
  }
  
  $('.click-columns')
    .on('mouseenter', function() {
      var col = $('.click-columns div:hover').index();
      createCursorChip(col);
    })
    .on('mouseleave', function() {
      destroyCursorChip();
    });
  
  $('.click-columns div')
    .on('mouseenter', function() {
      var col = $(this).index();
      moveCursorChip(col);
    })
    .on('click', function() {
      $('.click-columns, .click-columns div').off();
      
      var col = $(this).index();
      worker.postMessage({
        messageType: 'p' + currentPlayer + '-move',
        col: col
      });
    });  
}

function changePlayer(){
	if (currentPlayer == "1")
	{currentPlayer = "2";}
	else currentPlayer = "1";
}

function endHumanTurn(coords, isWin, winningChips, isBoardFull) {
  $('.click-columns div').removeClass('hover');
  if(!coords) {
    // column was full, human goes again
    startHumanTurn();    
  } else {
    dropCursorChip(coords.row, function() {
      if(isWin) {
        endGame("p" + currentPlayer + '-win', winningChips);
      } else if(isBoardFull) {
        endGame('tie');
      } else {
        // Change Player
		if (numberOfPlayers() == "1") {
			changePlayer();
			startComputerTurn();
		}
		else {
			changePlayer();
			startHumanTurn();
		}		
      }
    });
  }
}

function startComputerTurn() {
  setBlurb('ai-turn');
  
  // computer's cursor chip starts far left and moves right as it thinks
  createCursorChip(2, 0);
  
  var maxDepth = parseInt($('input[name=dif-options]:checked').val(), 10) + 1;
  worker.postMessage({
    messageType: 'computer-move',
    maxDepth: maxDepth
  });
}

function updateComputerTurn(col) {
  moveCursorChip(col);
}

function endComputerTurn(coords, isWin, winningChips, isBoardFull, isWinImminent, isLossImminent) {
  moveCursorChip(coords.col, function() {
    dropCursorChip(coords.row, function() {
      if (isWin) {
        endGame('ai-win', winningChips);
      } else if (isBoardFull) {
        endGame('tie');
      } else {
        // pass turn to human
		changePlayer();
        startHumanTurn();
      }
    });
  });
}

function endGame(blurbKey, winningChips) {
  $('.options').removeClass('freeze');
  $('.options input').prop('disabled', false);
  setBlurb(blurbKey);
  
  if(winningChips) {
    // not a tie, highlight the chips in the winning run
    for(var i = 0; i < winningChips.length; i++) {
      createLitCell(winningChips[i].col, winningChips[i].row);
    }
  }
}

function createLitCell(col, row) {
  $('<div>')
  .css({
    'left': indexToPixels(col),
    'bottom': indexToPixels(row)
  })
  .appendTo('.lit-cells');
}

function createCursorChip(col) {
  var playerClass = 'p' + currentPlayer;
  $('<div>', { 'class': 'cursor ' + playerClass })
    .css('left', indexToPixels(col))
    .appendTo('.chips');
  
  // also highlight column
  $('.lit-columns div').eq(col).addClass('lit');
}

function destroyCursorChip() {
  $('.chips .cursor').remove();
  $('.lit-columns .lit').removeClass('lit');
}

function moveCursorChip(col, callback) {
  $('.chips .cursor').css('left', indexToPixels(col));
  $('.lit-columns .lit').removeClass('lit');
  $('.lit-columns div').eq(col).addClass('lit');
  
  // callback is only used when the computer is about to drop a chip
  // give it a slight delay for visual interest
  setTimeout(callback, 300);
}

function dropCursorChip(row, callback) {
  // speed of animation depends on how far the chip has to drop
  var ms = (7 - row) * 40;
  var duration = (ms / 1000) + 's';
  
  $('.chips .cursor')
    .removeClass('cursor')
    .css({
      'bottom': indexToPixels(row),
      '-webkit-transition-duration': duration, 'transition-duration': duration,
      '-webkit-animation-delay': duration, 'animation-delay': duration
    })
    .addClass('dropped');
  
  $('.lit-columns .lit').removeClass('lit');
  setTimeout(callback, ms);
}

function indexToPixels(index) {
  return (index * 61 + 1) + 'px';
}