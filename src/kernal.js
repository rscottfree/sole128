var kernal = (function () {
	"use strict";

	var USE_ANIMATION_FRAME = 0;

	var fontHeight;
	var lineHeight;
	var borderWidth;
	var marginWidth;
	var innerWidth;
	var width;
	var innerHeight;
	var height;
	var charWidth;
	var totalCharAcross;
	var totalCharDown;
	var canvas;
	var context;
	var fontStyle;
	var backgroundColor;
	var foregroundColor;
	var borderColor;
	var _cursorPosition = {};
	var cursorPosition;
	var cursorPixelPosition = {};

	var cursorCanvas;
	var cursorContext;

	var textCanvas;
	var textContext;

	var time = {};

	var buffer = {};

	var _inputBuffer = [];
	var inputBuffer;

	// filter control characters < 32 (keep value)
	var filterKeys = [8, 9, 13];

	// fix key codes >= 32 (change value)
	var fixKeys = [37, 38, 39, 40];
	var keyIdentifiers = ['Enter'];

	function Char(row, column, character) {
		if (undefined === character) {
			character = '';
		}

		this.row = row;
		this.column = column;
		this.character = character;
	}
	Char.prototype.row = null;
	Char.prototype.column = null;
	Char.prototype.character = null;

	function init() {
		time = {
			runTime: 0,
			lastCursorChangeTime: 0
		};

		backgroundColor = '#3E3EE4';
		foregroundColor = '#A5A5FF';
		borderColor = foregroundColor;

		backgroundColor = 'rgb(55, 48, 131)';
		foregroundColor = 'rgb(115, 107, 190)';
		borderColor = foregroundColor;

		borderWidth = 33;
		marginWidth = 5;
		fontHeight = getFontHeight();
		lineHeight = getLineHeight();
		charWidth = getCharWidth();
		innerWidth = (window.innerWidth - (borderWidth * 2)) - (marginWidth * 2);
		width = (innerWidth - (innerWidth % charWidth)) + (borderWidth * 2);
		innerHeight = (window.innerHeight - (borderWidth * 2)) - (marginWidth *
			2);
		height = (innerHeight - (innerHeight % lineHeight)) + (borderWidth * 2) +
			2;

		// estimated number of characters that fit across the text area
		totalCharAcross = Math.floor((width - (borderWidth * 2)) / charWidth);
		totalCharDown = Math.floor((height - (borderWidth * 2)) / lineHeight);

		// console.log(totalCharDown, totalCharAcross);

		for (var row = 0; row < totalCharDown; row++) {
			for (var column = 0; column < totalCharAcross; column++) {
				var newChar = new Char(row, column);
				buffer[row + ',' + column] = newChar;
				/*
				Object.observe(newChar, (function(changes) {
				  changes.forEach(function(change) {
					if (change.type === 'update' && change.name ===
					  'character') {

					  moveCursor(change.object.column, change.object.row);

					  textContext.clearRect(cursorPixelPosition.x,
						cursorPixelPosition.y,
						charWidth, lineHeight);

					  textContext.fillText(change.object.character.toUpperCase(),
						cursorPixelPosition.x, cursorPixelPosition.y +
						lineHeight);
					}
				  });

				  // console.log(changes);
				}).bind(newChar));
				*/
			}
		}

		// console.log(buffer);

		canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.id = 'canvas';
		canvas.style.left = marginWidth + 'px';
		canvas.style.top = marginWidth + 'px';
		context = canvas.getContext('2d');
		// context.imageSmoothingEnabled = false;
		// context.font = getFontStyle();
		// context.fillStyle = foregroundColor;
		// context.textBaseline = 'top';


		textCanvas = document.createElement('canvas');
		textCanvas.width = width;
		textCanvas.height = height;
		textCanvas.id = 'text-canvas';
		textCanvas.style.left = marginWidth + 'px';
		textCanvas.style.top = marginWidth + 'px';
		textContext = textCanvas.getContext('2d');
		textContext.font = getFontStyle();
		textContext.fillStyle = foregroundColor;
		// textContext.textBaseline = 'alphabetic';
		// textContext.imageSmoothingEnabled = false;


		cursorCanvas = document.createElement('canvas');
		cursorCanvas.width = charWidth;
		cursorCanvas.height = lineHeight;
		cursorCanvas.id = 'cursor-canvas';
		cursorContext = cursorCanvas.getContext('2d');

		cursorPosition = {
			x: 0,
			y: 0
		};

		moveCursor(0, 0);

		drawBorder();
		drawTextArea();
		drawCursor();


		document.getElementById('commodore').appendChild(canvas);
		document.getElementById('commodore').style.width = width + "px";
		document.getElementById('commodore').style.height = height + "px";

		document.getElementById('commodore').appendChild(textCanvas);

		document.getElementById('commodore').appendChild(cursorCanvas);

		updateScreen(0);

		cursorPosition = new Proxy(_cursorPosition, {
			set: function (target, prop, value) {
				// console.log({ type: 'set', target, prop, value });
				const r = Reflect.set(target, prop, value);
				updateCursor();
				return r;
			}
		});

		// Object.observe(cursorPosition, function (changes) {
		// 	if (changes[0].type === 'update') {
		// 		updateCursor();
		// 	}
		// });

		document.addEventListener('keypress', function (event) {
			// console.log('keypress', event);
			// event.preventDefault();
			inputBuffer.push(event);
		});

		document.addEventListener('keydown', function (event) {
			if (filterKeys.indexOf(event.keyCode) !== -1) {
				// console.log('filtered', event.keyCode);
				event.preventDefault();
				event.stopPropagation();
				event.filtered = true;
				inputBuffer.push(event);
			} else if (fixKeys.indexOf(event.keyCode) !== -1) {
				// console.log('fixed', event.keyCode, event);
				event.preventDefault();
				event.stopPropagation();
				// event.charCode = event.keyCode;
				event.fixed = true;
				inputBuffer.push(event);
			}
			/*
			else if (keyIdentifiers.indexOf(event.keyIdentifier) !== -1) {
			  console.log('are you here?', event);
			  event.preventDefault();
			  event.stopPropagation();
			  event.fixed = true;
			  inputBuffer.push(event);
			} else if (event.keyIdentifier.indexOf("U+") === 0) {
			  // inputBuffer.push(event);
			}
			*/


			// console.log(event);
		});

	}

	function moveCursor(x, y) {
		if (x >= totalCharAcross) {
			x = 0;
			y = y + 1;
		} else if (x < 0) {
			x = totalCharAcross - 1;
			y = y - 1;
		}

		if (y >= totalCharDown) {
			var toScroll = y - totalCharDown + 1;
			// console.log('scrolling', y, totalCharDown, toScroll);
			scrollText(toScroll);

			y = y - toScroll;
		}

		cursorPosition.x = x;
		cursorPosition.y = y;
		cursorPixelPosition = getCursorPixelPosition();
	}

	function moveCursorRelative(x, y) {
		moveCursor(cursorPosition.x + x, cursorPosition.y + y);
	}

	function updateCursor() {
		// cursorPixelPosition = getCursorPixelPosition();

		cursorCanvas.style.left = marginWidth + cursorPixelPosition.x + 'px';
		cursorCanvas.style.top = marginWidth + cursorPixelPosition.y + 'px';

		cursorCanvas.classList.add('cursor-medium-opacity');

		if (USE_ANIMATION_FRAME) {
			if (time.runTime - time.lastCursorChangeTime > 1100) {
				time.lastCursorChangeTime = time.runTime;
				if (cursorCanvas.classList.contains('cursor-high-opacity')) {
					cursorCanvas.classList.add('cursor-low-opacity');
					cursorCanvas.classList.remove('cursor-high-opacity');
				} else {
					cursorCanvas.classList.add('cursor-high-opacity');
					cursorCanvas.classList.remove('cursor-low-opacity');
				}
			}
		}

	}

	function update() {
		window.requestAnimationFrame(updateScreen);
	}

	function updateScreen(rafTime) {
		time.runTime = rafTime;

		clearScreen();

		drawBorder();
		drawTextArea();
		drawText();
		updateCursor();

		if (USE_ANIMATION_FRAME) {
			update();
		}
	}

	function print(text) {
		// c = c.toUpperCase();

		for (var i = 0; i < text.length; i++) {
			var c = text[i];
			// console.log('printing', c, cursorPosition.x, cursorPosition.y);
			buffer[cursorPosition.y + ',' + cursorPosition.x].character = c;

			// console.log(cursorPosition.x + 1, totalCharAcross);
			moveCursor(cursorPosition.x + 1, cursorPosition.y);
		}

		update();

		/*
		textContext.clearRect(cursorPixelPosition.x,
		  cursorPixelPosition.y,
		  charWidth, lineHeight);

		textContext.fillText(c,
		  cursorPixelPosition.x, cursorPixelPosition.y +
		  lineHeight);

		moveCursor(cursorPosition.x + 1, cursorPosition.y);
		*/
	}

	function clearScreen() {
		context.clearRect(0, 0, canvas.width, canvas.height);
		textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
	}

	function drawBorder() {
		context.fillStyle = borderColor;

		context.fillRect(0, 0, borderWidth, height);
		context.fillRect(width - borderWidth, 0, width, height);

		context.fillRect(borderWidth, 0, width - borderWidth, borderWidth);

		context.fillRect(borderWidth, height - borderWidth, width - borderWidth,
			height);
	}

	function drawTextArea() {
		context.fillStyle = backgroundColor;
		context.fillRect(borderWidth, borderWidth, width - borderWidth * 2,
			height - borderWidth * 2);
	}

	function drawText() {
		for (var row = 0; row < totalCharDown; row++) {
			for (var column = 0; column < totalCharAcross; column++) {
				var ch = buffer[row + ',' + column];
				var position = getPixelPositionForRowColumn(row, column);

				textContext.fillText(ch.character, position.x, position.y +
					lineHeight);
			}
		}
	}

	function clearBuffer() {
		for (var row = 0; row < totalCharDown; row++) {
			for (var column = 0; column < totalCharAcross; column++) {
				buffer[row + ',' + column] = new Char(row, column, '');
			}
		}
	}

	function scrollText(numLines) {
		for (var row = 0; row < totalCharDown; row++) {
			for (var column = 0; column < totalCharAcross; column++) {
				var whichRow = row - numLines;

				if (whichRow >= 0) {
					var ch = buffer[row + ',' + column];
					buffer[whichRow + ',' + column] = ch;
					buffer[row + ',' + column] = new Char(row, column);
				}
			}
		}

		// moveCursor(cursorPosition.x, cursorPosition.y - numLines);

		update();
	}

	function getFontStyle() {
		// return "normal " + fontHeight + "pt 'CousineRegular', monospace";

		// return 'normal ' + fontHeight + "pt 'F25_Bank_Printer', monospace";

		return 'normal ' + fontHeight + "pt 'Commodore 64 Rounded', monospace";

	}

	function getCharWidth() {
		var myCanvas = document.createElement('canvas');
		myCanvas.width = 300;
		myCanvas.height = 300;
		var ctx = myCanvas.getContext('2d');
		ctx.font = getFontStyle();
		// ctx.textBaseline = 'alphabetic';
		var charWidth = ctx.measureText('W').width;
		charWidth = Math.ceil(charWidth);
		charWidth++;

		return charWidth;
	}

	function getLineHeight() {
		var lineHeight = fontHeight + Math.ceil(fontHeight * (fontHeight <= 16 ?
			.55 : .50));

		lineHeight = fontHeight + Math.ceil(fontHeight * .08);

		return lineHeight;
	}

	function getFontHeight() {
		return 22;
	}

	function getCursorPixelPosition() {
		var pp = {};
		pp.x = (cursorPosition.x * charWidth) + borderWidth;
		pp.y = (cursorPosition.y * lineHeight) + borderWidth;

		return pp;
	}

	function getPixelPositionForRowColumn(row, column) {
		var pp = {};
		pp.x = (column * charWidth) + borderWidth;
		pp.y = (row * lineHeight) + borderWidth;

		return pp;
	}

	function drawCursor() {
		var beginFillStyle = cursorContext.fillStyle;

		cursorContext.fillStyle = foregroundColor;
		cursorContext.fillRect(0, 0, cursorCanvas.width, cursorCanvas.height);

		cursorContext.fillStyle = beginFillStyle;

		cursorCanvas.style.visibility = 'visible';
	}

	function hideCursor() {
		cursorCanvas.style.visibility = 'hidden';
	}

	function getGet() {
		var p = new Promise((function (resolve, reject) {
			inputBuffer = new Proxy(_inputBuffer, {
				set: function (target, property, event, receiver) {
					// console.log('setting ' + property + ' for ' + target + ' with value ' + event);
					target[property] = event;

					if (event) {
						// var event = change.object[change.name];
						// var value = String.fromCharCode(event.charCode);
						// console.log('get', event);
						var value = '';
						if (event.fixed) {
							switch (event.keyCode) {
								case 37:
									value = -1;
									break;
								case 38:
									value = -2;
									break;
								case 39:
									value = -3;
									break;
								case 40:
									value = -4;
									break;

								default:
									value = -999;
									break;
							}

							// value = event.keyIdentifier.toLowerCase();
						} else if (event.filtered) {
							value = event.keyCode;
						} else {
							value = event.charCode;
						}

						resolve(value);
					}
					// you have to return true to accept the changes
					return true;
				}
			});

			// Object.observe(inputBuffer, function (changes) {
			// 	// console.log(changes[0]);
			// 	var change = changes[0];
			// 	if (change.type === 'add') {
			// 		var event = change.object[change.name];
			// 		// var value = String.fromCharCode(event.charCode);
			// 		// console.log('get', event);
			// 		var value = '';
			// 		if (event.fixed) {
			// 			switch (event.keyCode) {
			// 				case 37:
			// 					value = -1;
			// 					break;
			// 				case 38:
			// 					value = -2;
			// 					break;
			// 				case 39:
			// 					value = -3;
			// 					break;
			// 				case 40:
			// 					value = -4;
			// 					break;

			// 				default:
			// 					value = -999;
			// 					break;
			// 			}

			// 			// value = event.keyIdentifier.toLowerCase();
			// 		} else if (event.filtered) {
			// 			value = event.keyCode;
			// 		} else {
			// 			value = event.charCode;
			// 		}

			// 		resolve(value);
			// 	}
			// });
		}).bind(this));

		return p;
	}

	function getInput() {
		inputBuffer = [];
		let inputBufferRevocable;

		var p = new Promise((function (resolve, reject) {
			var itext = '';

			var observeInputBuffer = (function (event) {
				if (event) {
					// var event = change.object[change.name];
					var charCode = event.charCode;
					var keyCode = event.keyCode;
					// console.log(event);
					// console.log(charCode, keyCode);
					// console.log(event.keyIdentifier);
					console.log(event);
					console.log(event.key);

					if (event.key === 'Enter') {
						// console.log('enter');
						// inputBufferRevocable.revoke();
						// Object.unobserve(inputBuffer, observeInputBuffer);
						inputBuffer = [];
						moveCursor(0, cursorPosition.y + 1);
						resolve(itext);
					} else if (keyCode === 8) {
						// event.preventDefault();

						if (itext.length > 0) {
							itext = itext.slice(0, itext.length - 1);
							//console.log(cursorPosition.x,
							//  cursorPosition.y);
							moveCursor(cursorPosition.x - 1, cursorPosition.y);
							//console.log(cursorPosition.x,
							//  cursorPosition.y);
							buffer[cursorPosition.y + ',' + cursorPosition.x].character = '';
							update();
						}
					} else if (event.key && event.key.length > 0) {
						// console.log(event);

						var c = String.fromCharCode(event.charCode);
						itext += c;
						print(c);
					}
				}
			}).bind(this);

			inputBufferRevocable = Proxy.revocable(_inputBuffer, {
				set: function (target, property, value, receiver) {
					// console.log('setting ' + property + ' for ' + target + ' with value ' + value);
					target[property] = value;

					observeInputBuffer(value);
					// you have to return true to accept the changes
					return true;
				}
			});

			inputBuffer = inputBufferRevocable.proxy;

			// Object.observe(inputBuffer, observeInputBuffer);

		}).bind(this));


		// resolve("cheese");

		return p;
	}

	function setBuffer(x, y, c) {
		var newChar = new Char(y, x, c);
		buffer[y + ',' + x] = newChar;
	}

	return {
		'init': init,
		'moveCursor': moveCursor,
		'moveCursorRelative': moveCursorRelative,
		'getCursorPosition': function () {
			return {
				'x': cursorPosition.x,
				'y': cursorPosition.y
			};
		},
		'getTotalCharAcross': function () {
			return totalCharAcross;
		},
		'getTotalCharDown': function () {
			return totalCharDown;
		},
		'print': print,
		'getInput': getInput,
		'getGet': getGet,
		'getInputBuffer': function () {
			return inputBuffer;
		},
		'clearInputBuffer': function () {
			inputBuffer = [];
		},
		'scrollText': scrollText,
		'update': update,
		'setBuffer': setBuffer,
		'clearBuffer': clearBuffer,
		'getBufferChar': function (x, y) {
			return buffer[y + ',' + x];
		}
	}
})();