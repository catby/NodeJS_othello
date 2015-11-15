var http = require('http');
var fs = require('fs');
var ws = require('socket.io');

var singleMode = false;
var server = http.createServer();
server.on('request', doRequest);
server.listen(88);
console.log('Server running!');

function doRequest(request, response) {
	if(request.url == "/") {
		fs.readFile('./othello.htm', 'UTF-8',
			function(err, data)
			{
				response.writeHead(200, {'Content-Type': 'text/html' });
				response.write(data);
				response.end();
			}
		);
	}
	else if(request.url == "/1") {
		singleMode = true;
		fs.readFile('./othello.htm', 'UTF-8',
			function(err, data)
			{
				response.writeHead(200, {'Content-Type': 'text/html' });
				response.write(data);
				response.end();
			}
		);
	}
	else if(request.url == "/style.css") {
		fs.readFile('./style.css', 'UTF-8',
			function(err, data)
			{
				response.writeHead(200, {'Content-Type': 'text/css' });
				response.write(data);
				response.end();
			}
		);
	}
	else if(request.url == "/othello.js") {
		fs.readFile('./othello.js', 'UTF-8',
			function(err, data)
			{
				data = data.replace("HOST_ADDRESS", request.headers['host']);
				
				response.writeHead(200, {'Content-Type': 'text/javascript' });
				response.write(data);
				response.end();
			}
		);
	}
}

var colorTable = ["", ""];
var ackTable   = [false, false];
var turn = 1;

var board = new Array(10);
clearBoard();


// 通信用サーバーを立てる
var wsserver = ws.listen(server);

wsserver.sockets.on("connection", function(socket) {
	{	// onConnect
		//console.log(socket);
		var socKey = socket["conn"]["id"];

		// 接続した時の動作規定
		console.log("connect from " + socKey);

		var color = getColor(socKey);
		if(color != -1) {
			socket.send("color:" + color);
		}
		else {
			socket.send("color:" + -1);
		}
	}

	// 切断した時の動作規定
	socket.on("disconnect", function() {
		console.log("close from " + socKey);
		for(var i = 0 ; i < 2 ; i++) {
			if(colorTable[i] == socKey) {
				colorTable[i] = "";
				ackTable[i]   = false;
				return;
			}
		}
		singleMode = false;
	});

	// メッセージを受けた時の動作規定
	socket.on("message", function(data) {
		var color = getColor(socKey);
		console.log("message from " + socKey);
		console.log("[" + color + "]" + "\"" + data + "\"");

		var splitData = data.split(":");
		if(splitData[0] == "ack") {
			if(color != -1) {
				ackTable[color-1] = true;
				if(singleMode) {
					ackTable[color] = true;
				}
			}

			if(ackTable[0] && ackTable[1]) {
				var ret = checkStones(0);
				socket.send("message:" + ret[1]);
				socket.broadcast.send("message:" + ret[1]);
				socket.send("stone:" + turn + ":" + createStoneString());
				socket.broadcast.send("stone:" + turn + ":" + createStoneString());
			}
			else {
				socket.send("message:対戦相手の接続待機中...");
			}
		}
		if(splitData[0] == "stone") {
			if(color == turn) {
				var inx = parseInt(splitData[1]);
				var iny = parseInt(splitData[2]);
				if(flipStones(inx, iny)) {
					var ret = checkStones(0);
					
					socket.send("message:" + ret[1]);
					socket.broadcast.send("message:" + ret[1]);
					socket.send("stone:" + turn + ":" + createStoneString());
					socket.broadcast.send("stone:" + turn + ":" + createStoneString());
					if(ret[0] == 0) {
						colorTable[0] = "";
						colorTable[1] = "";
						ackTable[0]   = false;
						ackTable[1]   = false;
						clearBoard();
						wsserver.clients.forEach(function(client) {
							if(client != null) {
								client.close();
							}
						});
					}
					else if(singleMode && (turn == 2)) {
						sleep(1300);
						var choice = Math.floor(Math.random() * ret[0]);
						flipStones_withPC(choice);
					}
				}
			}
		}
	});

	// メッセージを受けた時の動作規定
	socket.on("error", function(data) {
		console.log("error from " + socKey);
	});
});



function getColor(key)
{
	console.log("getColor()" + key);
	for(var i = 0 ; i < 2 ; i++) {
		console.log("colorTable[" + i + "]=" + colorTable[i]);
		if(colorTable[i] == key) {
			return i+1;
		}
		else if(colorTable[i] == "") {
			colorTable[i] = key;
			if(singleMode) {
				colorTable[i+1] = "0";
			}
			return i+1;
		}
	}
	return -1;
}

function clearBoard()
{
	for(var i = 0 ; i < 10 ; i++) {
		board[i] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	}
	board[4][5] = 1;
	board[5][4] = 1;
	board[4][4] = 2;
	board[5][5] = 2;
	
	turn = 1;
}

function createStoneString()
{
	var str = "";
	for(var x = 1 ; x <= 8 ; x++) {
		for(var y = 1 ; y <= 8 ; y++) {
			str += board[x][y];
		}
	}
	return str;
}

function flipStones_withPC(choice)
{
	for(var x = 1 ; x <= 8 ; x++) {
		for(var y = 1 ; y <= 8 ; y++) {
			if(board[x][y] == 3) {
				if(choice == 0) {
					console.log("[" + turn + "]" + "\"stone:" + x + ":" + y + "\"");
					flipStones(x, y);
					
					var ret = checkStones(0);
					socket.send("message:" + ret[1]);
					socket.broadcast.send("message:" + ret[1]);
					socket.send("stone:" + turn + ":" + createStoneString());
					socket.broadcast.send("stone:" + turn + ":" + createStoneString());
					if(ret[0] == 0) {
						colorTable[0] = "";
						colorTable[1] = "";
						ackTable[0]   = false;
						ackTable[1]   = false;
						clearBoard();
						wsserver.clients.forEach(function(client) {
							if(client != null) {
								client.close();
							}
						});
					}
					if(turn == 2) {
						sleep(1300);
						var choice = Math.floor(Math.random() * ret[0]);
						flipStones_withPC(choice);
					}
					return;
				}
				choice--;
			}
		}
	}
}

// place and flip the stones
function flipStones(inx, iny)
{
	// fliped or not
	var flag = false;
	if((board[inx][iny] == 1) || (board[inx][iny] == 2)) {
		return;
	}
	
	// 8 directions
	var opponent = 3 - turn;
	for(var dx = -1 ; dx <= 1 ; dx++) {
		for(var dy = -1 ; dy <= 1 ; dy++) {
			if(dx == 0 && dy == 0) {
				continue;
			}
			var n = 1;
			while(board[inx + n*dx][iny + n*dy] == opponent) {
				n++;
			}
			if(n > 1 && board[inx + n*dx][iny + n*dy] == turn) {
				n = 1;
				while(board[inx + n*dx][iny + n*dy] == opponent) {
					board[inx + n*dx][iny + n*dy] = turn;
					n++;
				}
				flag = true;
			}
		}
	}
	if(flag){
		board[inx][iny] = turn;
		turn = 3 - turn;
	}
	
	return flag;
}

// check flipping stones
function checkStones(count)
{
	var opponent = 3 - turn;
	var checkPoint = 0;
	var num_BlackStone = 0;
	var num_WhiteStone = 0;
	var num_EmptyStone = 0;
	
	for(var x = 1 ; x <= 8 ; x++) {
		for(var y = 1 ; y <= 8 ; y++) {
			if(board[x][y] == 3) {
				board[x][y] = 0;
			}
			else if(board[x][y] != 0) {
				if(board[x][y] == 1) {
					num_BlackStone++;
				}
				else if(board[x][y] == 2) {
					num_WhiteStone++;
				}
				continue;
			}
			num_EmptyStone++;
check:		for(var dx = -1 ; dx <= 1 ; dx++) {
				for(var dy = -1 ; dy <= 1 ; dy++) {
					if(dx == 0 && dy == 0) {
						continue;
					}
					var n = 1;
					while(board[x + n*dx][y + n*dy] == opponent) {
						n++;
					}
					if(n > 1 && board[x + n*dx][y + n*dy] == turn) {
						board[x][y] = 3;
						checkPoint++;
						break check;
					}
				}
			}
		}
	}
	if((num_EmptyStone != 0) && (checkPoint == 0) && (count == 0)) {
		turn = 3 - turn;
		return checkStones(count + 1, msg);
	}
	var msg = "";
	if(checkPoint > 0) {
		if(turn == 1) {
			msg = "クロの番です(" + num_BlackStone + " ： " + num_WhiteStone + ")";
		}
		else {
			msg = "シロの番です(" + num_BlackStone + " ： " + num_WhiteStone + ")";
		}
	}
	else {
		if(num_BlackStone > num_WhiteStone) {
			msg = "クロの勝ちです!!(" + num_BlackStone + " ： " + num_WhiteStone + ")";
		}
		else if(num_BlackStone < num_WhiteStone) {
			msg = "シロの勝ちです!!(" + num_BlackStone + " ： " + num_WhiteStone + ")";
		}
		else  {
			msg = "同点です(" + num_BlackStone + " ： " + num_WhiteStone + ")";
		}
	}
	return [checkPoint, msg];
}

function sleep(time) {
  var d1 = new Date().getTime();
  var d2 = new Date().getTime();
  while (d2 < d1 + time) {
    d2 = new Date().getTime();
   }
   return;
}
