var isDebug = true;

// turn; black:1 white:2
var isInitialize = false;
var isConnecting = false;
var turn = 0;
var color = -1;
var boardAccess = 1;

var rotationWhiteAry = new Array();
var rotationBlackAry = new Array();
var pinSetAry        = new Array();
var intervalID;
var reversCnt;

// array for the stones
var board = new Array(8);
for(var i = 0 ; i < 8 ; i++) {
	board[i] = [0, 0, 0, 0, 0, 0, 0, 0];
}

var ws = io.connect('http://HOST_ADDRESS');

onload = function()
{
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');

	canvas.addEventListener('click', function(event)
		{
			if(boardAccess == 1) {
				placeStone(canvas, event.pageX, event.pageY);
			}
		},
		false);
	initialize(ctx);
};

// initialize the board
function initialize(ctx)
{
	ctx.beginPath();
	for(var i = 1 ; i < 8 ; i++) {
		ctx.moveTo(0,    i*80);
		ctx.lineTo(640,  i*80);
		ctx.moveTo(i*80, 0);
		ctx.lineTo(i*80, 640);
	}
	ctx.closePath();
	ctx.stroke();
	isInitialize = true;
	
	if(isInitialize && isConnecting) {
		ws.send("ack");
	}
}

function placeStone(canvas, mouseX, mouseY)
{
	rect = canvas.getBoundingClientRect();
	mouseX -= (rect.left + window.pageXOffset);
	mouseY -= (rect.top  + window.pageYOffset);

	var inx = Math.ceil(mouseX / 80.0);
	var iny = Math.ceil(mouseY / 80.0);

	if((inx <= 8) && (iny <= 8)) {
		if(turn == color) {
			ws.send("stone:" + inx + ":" + iny);
		}
	}
}

// draw stones on the board
function drawStones(stone)
{
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');


	var tmp = new Array(8*8);
	for(var i = 0 ; i < (8*8) ; i++) {
		tmp[i] = parseInt(stone[i]);
		if((tmp[i] == 3) && (turn != color)) {
			tmp[i] = 0;
		}
	}

	for(var x = 0 ; x < 8 ; x++) {
		for(var y = 0 ; y < 8 ; y++) {
			if(tmp[x * 8 + y] == board[x][y]) {
				continue;
			}
			
			if(tmp[x * 8 + y] == 1) {
//				console.log(x + ":" + y + "=Black");
				if(board[x][y] == 2) {
					var adrs = {'x':x, 'y':y};
					rotationBlackAry.push(adrs);
				}
				else {
					drawStone(ctx, x, y, 'black');
				}
			}
			else if(tmp[x * 8 + y] == 2) {
//				console.log(x + ":" + y + "=White");
				if(board[x][y] == 1) {
					var adrs = {'x':x, 'y':y};
					rotationWhiteAry.push(adrs);
				}
				else {
					drawStone(ctx, x, y, 'white');
				}
			}
			else if(tmp[x * 8 + y] == 3) {
//				console.log(x + ":" + y + "=marker");
				var adrs = {'x':x, 'y':y};
				pinSetAry.push(adrs);
//				drawPin(ctx, x, y);
			}
			else if(tmp[x * 8 + y] == 0) {
//				console.log(x + ":" + y + "=empty");
				clearPin(ctx, x, y);
			}
			board[x][y] = tmp[x * 8 + y];
		}
	}
	
	reversCnt = 0;
	boardAccess = 0;
	intervalID = setInterval(rotateStone, 50);
}

function rotateStone()
{
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');

	var rotateSplit = 8;
	reversCnt++;

	for(var i = 0 ; i < rotationWhiteAry.length ; i++) {
		drawRotateStone(ctx, rotationWhiteAry[i]['x'], rotationWhiteAry[i]['y'], 'black', 'white', (reversCnt / rotateSplit) * 100);
	}
	for(var i = 0 ; i < rotationBlackAry.length ; i++) {
		drawRotateStone(ctx, rotationBlackAry[i]['x'], rotationBlackAry[i]['y'], 'white', 'black', (reversCnt / rotateSplit) * 100);
	}
	
	if(reversCnt >= rotateSplit) {
		for(var i = 0 ; i < pinSetAry.length ; i++) {
			drawPin(ctx, pinSetAry[i]['x'], pinSetAry[i]['y']);
		}
		rotationWhiteAry.length = 0;
		rotationBlackAry.length = 0;
		pinSetAry.length        = 0;
		clearInterval(intervalID);
		boardAccess = 1;
	}
}

// draw a stone
function drawStone(ctx, inx, iny, color)
{
	clearPin(ctx, inx, iny);

	ctx.beginPath();
	ctx.arc(40+inx*80, 40+iny*80, 35, 0, Math.PI*2, true);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.stroke();
	ctx.fill();
	ctx.closePath();
}

function drawRotateStone(ctx, inx, iny, beforeColor, afterColor, percent)
{
	clearPin(ctx, inx, iny);
	if(percent == 50) {
		return;
	}

	var mag, targetColor;
	if(percent < 50) {
		mag = ((50 - percent) * 2) / 100;
		targetColor = beforeColor;
	}
	else {
		mag = ((percent - 50) * 2) / 100;
		targetColor = afterColor;
	}
	
	ctx.save();
	ctx.beginPath();
	ctx.scale(mag, 1.0);
	ctx.arc((40+inx*80) / mag, 40+iny*80, 35, 0, Math.PI*2, true);
	ctx.strokeStyle = targetColor;
	ctx.fillStyle   = targetColor;
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
	ctx.restore();
}

// draw a pin
function drawPin(ctx, inx, iny)
{
	clearPin(ctx, inx, iny);

	ctx.beginPath();
	ctx.arc(40+inx*80, 40+iny*80, 8, 0, Math.PI*2, true);
	ctx.strokeStyle = 'yellow';
	ctx.fillStyle   = 'yellow';
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
}

// clear a pin
function clearPin(ctx, inx, iny)
{
	ctx.clearRect(3+inx*80, 3+iny*80, 74, 74);
}


ws.on('connect', function() {
	if(isDebug)		console.log("ws.onopen");
});

ws.on('message', function(message) {
	if(isDebug)		console.log("ws.onmessage:" + message);
	
	var packet = message.split(":");
	if(packet[0] == "color") {
		isConnecting = true;
		color = parseInt(packet[1]);
		if(color == 1) {
			document.getElementById("ownMsg").innerHTML = "あなたの石の色はクロです";
		}
		else if(color == 2) {
			document.getElementById("ownMsg").innerHTML = "あなたの石の色はシロです";
		}

		if(isInitialize && isConnecting) {
			ws.send("ack");
		}
	}
	else if(packet[0] == "stone") {
		turn = parseInt(packet[1]);
		drawStones(packet[2]);
	}
	else if(packet[0] == "message") {
		document.getElementById('comment').innerHTML = packet[1];
	}
});

ws.on('disconnect', function() {
	if(isDebug)		console.log("ws.onclose");
});

window.unload = function() {
	if(isDebug)		console.log("ws.unload");
	ws.close();
}
