"use strict";

var k = kernal;
var i = interpreter;

var line = [];
var e = {
	w: 0,
	h: 0,
	memory: []
};

k.init();

i.clearRuntime();
k.moveCursor(0, 0);
i.printText("READY.");
k.moveCursor(0, 1);

var currentLastValue;

go();

function go() {
	runLine('GET').then(function () {
		var key = i.getVariables()['!'];
		// console.log(key);

		switch (key) {

		case 8:
			if (k.getCursorPosition().x > 0) {
				line.pop();
				k.moveCursor(k.getCursorPosition().x - 1,
					k.getCursorPosition().y);
				k.setBuffer(k.getCursorPosition().x,
					k.getCursorPosition().y,
					'');
				k.update();
				go();
			} else {
				go();
			}

			break;

		case 13:
			var code = line.join('');
			line = [];

			i.setVariable('!', currentLastValue);

			k.moveCursor(0, k.getCursorPosition().y + 1);

			if ('edit' === code.toLowerCase()) {
				runEditor();
			} else {
				runLine(code).then(function () {
					currentLastValue = i.getVariables()['!'];
					go();
				});
			}
			break;

		case -1:
			console.log(k.getCursorPosition().x);
			if (k.getCursorPosition().x > 0) {
				k.moveCursorRelative(-1, 0);
			}
			go();
			break;
		case -3:
			k.moveCursorRelative(1, 0);
			go();
			break;
		case -2:
		case -4:
			go();
			break;
		default:
			console.log(key);
			var char = i.getCharFromCode(key);
			line.push(char);
			k.print(char);
			go();
			/*
			runLine('CHAR !').then(function () {
				line.push(i.getVariables()['!']);
				runLine('PRIN !').then(go);
			});
			*/
		}
	});
}


function runLine(codeLine) {
	var promise = new Promise(function (resolve, reject) {
		var code = [];
		code.push(codeLine)

		var node = i.parseCode(code);
		var p = i.executeNodeForPromise(node);

		p.then(function () {
			/*
			console.log('done executing node');
			var v = i.getVariables()['A$'];
			console.log('var = ' + v);
			var c = i.getCharFromCode(v);
			console.log('value = ' + c);
			*/
			// console.log(i.getVariables());
			resolve();
		});

	});

	return promise;
}


function runEditor() {
	i.runFile("editor.prg", function () {
		console.log('ALL DONE');
	});
}

function runEditor2() {
	runLine("cls").then(function () {
		e.memory[0] = "CLS";
		// i.printText("RUNNNING EDITOR...");
		e.w = k.getTotalCharAcross();
		e.h = k.getTotalCharDown();

		console.log(e.w, e.h);

		var cp = k.getCursorPosition();
		displayEditor();
		k.moveCursor(cp.x, cp.y);
	});
}

function displayEditor() {
	for (var lineNum = 0; lineNum < e.memory.length; lineNum++) {
		i.printText(e.memory[lineNum]);
	}
}