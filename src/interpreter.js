var interpreter = (function (kernal) {
	"use strict";

	var logging = true;

	var input_prompt = '';

	var variables = Object.create(null);
	variables['!'] = '';

	// var lastExpressionVariables = [];
	var statementWords = ['to', 'next', 'step', 'gosub', 'goto', ':',
    	'return', 'end', 'stop', 'run', 'execute', 'cls', 'sleep'
  	];
	var expressionWords = [
		'pos', 'xpos', 'ypos', 'prin', 'print', 'add', 'input', 'if',
		'then', 'subtract', 'multiply', 'divide', 'loop',
		'length', 'get', 'charcode', 'char', 'tonumber',
		'tostring', 'toupper', 'tolower', 'concat', 'debug',
		'screenline', 'xposmax', 'yposmax', 'poke'
	];

	var stack = [];
	var labelStack = [];
	var labelMap = {};

	var ERROR = {
		"INCOMPATIBLE_TYPE_COMPARISON": "Incompatible type comparison"
	};

	var TYPE = {
		LITERAL: 'literal',
		IDENTIFIER: 'identifier',
		RESERVED: 'reserved word',
		COMP_OPERATOR: 'comparison operator',
		ASSIGN_OPERATOR: 'assignment operator',

		COMMENT: 'comment',
		SPACE: 'space'
	};

	var NODE_TYPE = {
		ROOT: 'root',
		STATEMENT: 'statement',
		ASSIGNMENT: 'assignment',
		LITERAL: 'literal',
		EXPRESSION: 'expression',
	};

	var DATA_TYPE = {
		STR: 'string',
		INT: 'integer',
		FLOAT: 'float',
		ARRAY: 'array',

		ARRAY_OPENER: 'array opener',
		ARRAY_CLOSER: 'array closer'
	};

	var STACK_TYPE = {
		LOOP: 'loop',
		LABEL: 'label'
	};


	function StackItem(type) {
		this.type = type;
	}
	StackItem.prototype.type = null;
	StackItem.prototype.node = null;
	StackItem.prototype.obj = null;

	function StackLoop(node) {
		this.startIndex = getValueFromToken(node.tokens[1]);
		this.endIndex = getValueFromToken(node.tokens[3]);

		if (node.tokens[4].value === 'step') {
			this.step = getValueFromToken(node.tokens[5]);
		} else {
			this.step = 1;
		}

		this.currentIndex = 0;
	}
	StackLoop.prototype.startIndex = 0;
	StackLoop.prototype.endIndex = 0;
	StackLoop.prototype.step = 0;
	StackLoop.prototype.currentIndex = 0;

	function StackLabel(node, returnNode) {
		this.name = node.tokens[1].value;
		this.returnNode = returnNode;
	}
	StackLabel.prototype.name = '';
	StackLabel.prototype.returnNode = null;

	function Token() {
		this.childTokens = [];
	}
	Token.prototype.lineNum = null;
	Token.prototype.column = null;
	Token.prototype.type = null;
	Token.prototype.text = null;
	Token.prototype.value = null;
	Token.prototype.dataType = null;
	Token.prototype.childTokens = null;

	function Node() {
		this.children = [];
		this.tokens = [];
	}
	Node.prototype.tokens = null;
	Node.prototype.parent = null;
	Node.prototype.children = null;
	Node.prototype.nextSibling = null;
	Node.prototype.previousSibling = null;
	Node.prototype.type = null;
	Node.prototype.match = null;


	function init() {
		// runFile('bootstrap.prg');
	}

	function getVariables() {
		return variables;
	}

	function runFile(fileName, resolver) {
		// console.log('running', fileName);

		var request = new XMLHttpRequest();
		request.open('GET', fileName);
		request.onloadend = function () {
			runCode(request.responseText, resolver);
		}

		request.send();
	}


	function runCode(code, resolver) {
		// clearRuntime();
		code = code.split('\n');
		// console.log(code);

		var startingNode = parseCode(code);

		executeNode(startingNode, resolver);
	}

	/**
	 * Parse list of raw code and return starting node.
	 */
	function parseCode(code) {
		var tokens = getTokenList(code);
		console.log('tokens:', tokens);

		var syntaxTree = getSyntaxTree(tokens);
		// console.log('syntaxTree:', syntaxTree);

		return syntaxTree.children[0];
	}


	function clearRuntime() {
		stack = [];
		labelStack = [];
		labelMap = {};
		kernal.clearInputBuffer();
	}


	/**
	 * The resolver is for running files from the repl
	 */
	function executeNode(node, resolver) {
		try {
			if (!node) {
				// console.log('no more code to run');
				setTimeout(function () {
					if (resolver) {
						resolver('done!');
					}
					init();
				});
				return;
			}

			var promise = executeNodeForPromise(node);

			promise.then(
					(function (nextNode) {
						executeNode(nextNode, resolver);
					}).bind(this))
				.catch(handleError);

		} catch (error) {
			console.log(error);
			throw error;
		}
	}

	function executeNodeForPromise(node) {
		// console.log('executing', node);

		var promise = new Promise(function (resolve, reject) {

			if (node.type === NODE_TYPE.EXPRESSION || node.type === NODE_TYPE
				.STATEMENT) {

				if (node.tokens[0].type === TYPE.RESERVED) {
					handleReservedWords(node, resolve);
				} else if (node.tokens[0].type === TYPE.LITERAL) {
					handleLiterals(node, resolve);
				} else {
					reject(new Error("COMMAND NOT FOUND: " + node.tokens[0].text));
				}

			} else if (node.type === NODE_TYPE.ASSIGNMENT) {

				handleAssignments(node, resolve);

			} else {
				reject(new Error("Unrecognized: " + node.tokens[0].text));
			}

		});

		return promise;
	}

	function handleReservedWords(node, resolve) {
		switch (node.tokens[0].text.toLowerCase()) {

		case "pos":
			doPos(node);
			resolve(node.nextSibling);
			break;

		case "xpos":
			doXpos(node);
			resolve(node.nextSibling);
			break;

		case "ypos":
			doYpos(node);
			resolve(node.nextSibling);
			break;

		case "print":
			doPrint(node);
			resolve(node.nextSibling);
			break;

		case "prin":
			doPrin(node);
			resolve(node.nextSibling);
			break;

		case "add":
		case "subtract":
		case "multiply":
		case "divide":
			doMath(node, node.tokens[0].text);
			resolve(node.nextSibling);
			break;

		case "input":
			var li = null;

			// console.log(node);
			if (node.tokens.length > 1 && (node.tokens[1].type === TYPE.LITERAL || node.tokens[1].type === TYPE.IDENTIFIER)) {

				printText('' + getValueFromToken(node.tokens[1]) + input_prompt);
			} else {
				printText(input_prompt);
			}


			var p = kernal.getInput();

			p.then((function (value) {
					setExpressionAssignmentVariable(node, value);
					setTimeout(function () {
						resolve(node.nextSibling);
					});
				}).bind(this))
				.catch(handleError);

			break;

		case "get":
			/*
			var value = '';
			if (kernal.getInputBuffer().length > 0) {
			  var bufEvent = kernal.getInputBuffer().shift();
			  console.log(bufEvent);
			  value = String.fromCharCode(bufEvent.charCode);
			}

			setExpressionAssignmentVariable(node, value);
			resolve(node.nextSibling);
			*/


			kernal.getGet().then((function (value) {
					setExpressionAssignmentVariable(node, value);
					//setTimeout(function() {
					resolve(node.nextSibling);
					//});
				}).bind(this))
				.catch(handleError);


			break;

		case "if":
			resolve(doIf(node));
			break;

		case "loop":
			resolve(doLoop(node));
			break;

		case "next":
			resolve(doNext(node));
			break;

		case ":":
			resolve(doLabel(node));
			break;

		case "gosub":
			resolve(doGosub(node));
			break;

		case "goto":
			resolve(doGoto(node));
			break;

		case "end":
			resolve(null);
			break;

		case "length":
			resolve(doLength(node));
			break;

		case "run":
			runFile(getValueFromToken(node.tokens[1]), resolve);
			break;

		case "charcode":
			resolve(doCharcode(node));
			break;

		case "char":
			resolve(doChar(node));
			break;

		case "execute":
			resolve(doExecute(node));
			break;

		case "tonumber":
			resolve(doToNumber(node));
			break;

		case "tostring":
			resolve(doToString(node));
			break;

		case "toupper":
			resolve(doToUpper(node));
			break;

		case "tolower":
			resolve(doToLower(node));
			break;

		case "cls":
			resolve(doCls(node));
			break;

		case "sleep":
			doSleep(node, resolve);
			break;

		case "concat":
			resolve(doConcat(node));
			break;

		case "debug":
			resolve(doDebug(node));
			break;

		case "screenline":
			resolve(doScreenLine(node));
			break;

		case "xposmax":
			resolve(doXPosMax(node));
			break;

		case "yposmax":
			resolve(doYPosMax(node));
			break;

		case "poke":
			resolve(doPoke(node));
			break;

		default:
			break;
		}
	}

	function handleError(error) {
		printText(error.message);
		kernal.moveCursor(0, kernal.getCursorPosition().y + 1);
		console.log(error);
		if (error instanceof Error) {
			console.log("Internal Bad!", error.message, error.stack);
		} else if (error instanceof IError) {
			console.log("Code Bad!", error.message);
		}

		init();
	}

	function handleAssignments(node, resolve) {
		// var name = node.tokens[0].value;
		var name = getAssignmentFromExpression(node);
		if (null === name) {
			resolve(node.nextSibling);
			return;
		}

		var value;

		if (name.indexOf('[]', name.length - 2) !== -1 && node.tokens[0].type ===
			DATA_TYPE.ARRAY_OPENER) {

			value = getArrayFromAssignmentNode(node);

		} else {
			value = getValueFromToken(node.tokens[0]);
		}

		// could check that values match variable type

		setVariable(name, value);

		resolve(node.nextSibling);
	}

	function handleLiterals(node, resolve) {
		var expressionValue;

		if (node.tokens[0].dataType === DATA_TYPE.ARRAY_OPENER) {
			expressionValue = getArrayFromAssignmentNode(node);
		} else {
			expressionValue = node.tokens[0].value;
		}

		setExpressionAssignmentVariable(node, expressionValue);

		resolve(node.nextSibling);
	}

	function setVariable(name, value) {
		name = '' + name;

		var finalValue = undefined;

		if (name === '!') {
			finalValue = value;
		} else {
			if (/\[.*\]$/.test(name)) {
				if (/\[(-?\d+)\]$/.test(name)) {
					var arrayMatches = name.match(/\[(-?\d+)\]$/);
					var index = parseInt(arrayMatches[1]);
					var arrayName = name.replace(/(.+\[)-?\d+(\])/, "$1$2");

					variables[arrayName][index] = value;
					return; // return early because individual array values are set differently
				} else if (/\[[a-zA-Z]{1}[a-zA-Z0-9]*%\]$/.test(name)) {
					var arrayMatches = name.match(/\[(.+)\]$/);
					var index = parseInt(variables[arrayMatches[1]]);
					var arrayName = name.replace(/(.+\[).+(\])/, "$1$2");

					variables[arrayName][index] = value;
					return;
				} else {
					var varName = name.replace(/(.+\[).*(\])/, "$1$2");

					// console.log('getting value', token, index, varName);

					variables[varName] = value;
					return;
				}
				var arrayMatches = name.match(/\[(-?\d*)\]$/);
				if (arrayMatches[1].length > 0) {
					var index = parseInt(arrayMatches[1]);
					var arrayName = name.replace(/(.+\[)-?\d+(\])/, "$1$2");

					variables[arrayName][index] = value;
					return; // return early because individual array values are set differently

				} else {
					finalValue = value;
				}
			}
			/*if (name.indexOf('[]', name.length - 2) !== -1) {
			  // check to make sure it's an array
			  finalValue = value;
			}*/
			else if (name[name.length - 1] === '$') {
				finalValue = '' + value;
			} else if (name[name.length - 1] === '%') {
				finalValue = parseInt(value);
			} else {
				finalValue = parseFloat(value);
			}
		}

		variables[name] = finalValue;

		// console.log(variables);
	}

	function setExpressionAssignmentVariable(node, expressionValue) {
		var assignmentVariable = getAssignmentFromExpression(node);

		if (assignmentVariable) {
			setVariable('' + assignmentVariable, expressionValue);
		} else {
			setVariable('!', expressionValue);
		}
	}

	function getMatchingStackItem(node) {
		if (labelStack.length > 0) {
			return labelStack.pop();
		} else {
			return null;
		}

		/*
		for (var i = 0; i < labelStack.length; i++) {
		  if (node.match === labelStack[i].node) {
		    var matchingStackItem = labelStack.splice(i, 1)[0];
		    return matchingStackItem;
		  }
		}

		return null;
		*/
	}

	function doSleep(node, resolver) {
		var value = getValueFromToken(node.tokens[1]);
		setInterval((function () {
			resolver(node.nextSibling);
		}).bind(this), value);
	}

	function doCls(node) {
		kernal.clearBuffer();
		kernal.moveCursor(0, 0);
		kernal.update();

		return node.nextSibling;
	}

	function doConcat(node) {
		var returnValue = '';
		// console.log(node.tokens);
		for (var i = 1; i < node.tokens.length; i++) {
			if (node.tokens[i].type === TYPE.ASSIGN_OPERATOR) {
				break;
			}
			var v = getValueFromToken(node.tokens[i]);

			if (undefined != v) {
				returnValue += v;
			}
		}

		setExpressionAssignmentVariable(node, returnValue);

		return node.nextSibling;
	}

	function doDebug(node) {
		var value = getValueFromToken(node.tokens[1]);
		console.log('DEBUG:', value);

		return node.nextSibling;
	}

	function doScreenLine(node) {
		var returnValue = '';

		var y = getNumberValueFromToken(node.tokens[1]);

		for (var x = 0; x < kernal.getTotalCharAcross(); x++) {
			var c = kernal.getBufferChar(x, y);
			if (!c || undefined === c.character || '' === c.character || c.character.length < 1) {
				returnValue += ' ';
			} else {
				returnValue += kernal.getBufferChar(x, y).character;
			}
		}

		// console.dir(returnValue);

		setExpressionAssignmentVariable(node, returnValue);

		return node.nextSibling;
	}

	function doXPosMax(node) {
		setExpressionAssignmentVariable(node, kernal.getTotalCharAcross());

		return node.nextSibling;
	}

	function doYPosMax(node) {
		setExpressionAssignmentVariable(node, kernal.getTotalCharDown());

		return node.nextSibling;
	}

	function doPoke(node) {
		var type = getValueFromToken(node.tokens[1]);
		switch (type.toLowerCase()) {
		case 'b':
			var x = getNumberValueFromToken(node.tokens[2]);
			var y = getNumberValueFromToken(node.tokens[3]);
			var c = getValueFromToken(node.tokens[4]);

			// console.log(x, y, c.substring(0, 1), c.length);

			if (undefined != c && c.length > 0) {
				kernal.setBuffer(x, y, c.substring(0, 1));
				kernal.update();
			}

			break;
		}

		return node.nextSibling;
	}

	function doToUpper(node) {
		var value = getValueFromToken(node.tokens[1]);

		try {
			value = '' + value;
			value = value.toUpperCase();
		} catch (e) {}

		setExpressionAssignmentVariable(node, value);

		return node.nextSibling;
	}

	function doToLower(node) {
		var value = getValueFromToken(node.tokens[1]);

		try {
			value = '' + value;
			value = value.toLowerCase();
		} catch (e) {}

		setExpressionAssignmentVariable(node, value);

		return node.nextSibling;
	}

	function doToNumber(node) {
		var value = NaN;

		try {
			value = getValueFromToken(node.tokens[1]);
			value = parseFloat('' + value);
		} catch (e) {
			value = NaN;
		}

		setExpressionAssignmentVariable(node, value);

		return node.nextSibling;
	}

	function doToString(node) {
		var value = '';

		try {
			value = getValueFromToken(node.tokens[1]);
			value = '' + value;
		} catch (e) {
			value = '';
		}

		setExpressionAssignmentVariable(node, value);

		return node.nextSibling;
	}

	function doCharcode(node) {
		var character = getValueFromToken(node.tokens[1]);
		var code = character.charCodeAt(0);

		setExpressionAssignmentVariable(node, code);

		return node.nextSibling;
	}

	function doChar(node) {
		var code = getValueFromToken(node.tokens[1]);

		var character = getCharFromCode(code);

		setExpressionAssignmentVariable(node, character);

		return node.nextSibling;
	}

	function getCharFromCode(code) {
		var character = '';

		if (code >= 0) {
			character = String.fromCharCode(code);
		} else {
			character = '';
		}

		return character;
	}

	function doLength(node) {
		var valueToken = node.tokens[1];
		var length = getValueFromToken(valueToken).length;

		setExpressionAssignmentVariable(node, length);

		return node.nextSibling;
	}

	function doGoto(node) {
		// console.log('goto', node.tokens);

		if (node.tokens[1].type === TYPE.IDENTIFIER) {
			var labelNode = labelMap[node.tokens[1].value];

			if (!labelNode) {
				throw Error("Not a valid label");
				return;
			}

			/*
			var si = new StackItem(STACK_TYPE.LABEL);
			si.node = labelNode;

			var label = new StackLabel(labelNode, node.nextSibling);

			si.obj = label;

			labelStack.push(si);
			*/

			return labelNode.nextSibling;

		} else if (node.tokens[1].type === TYPE.LITERAL) {
			var line = node.tokens[1].value;

			// console.log(node);

			var length = node.parent.children.length;
			for (var i = 0; i < length; i++) {
				// console.log('line', node.parent.children[i].tokens[0].lineNum, line);
				if (node.parent.children[i].tokens[0].lineNum === line) {
					// console.log('returning', node.parent.children[i]);
					return node.parent.children[i];
				}
			}
		}

		return node.nextSibling;
	}

	function doGosub(node) {
		var labelName = node.tokens[1].value;
		var labelNode = labelMap[labelName];

		if (!labelNode) {
			throw Error("Not a valid label");
			return;
		}

		var si = new StackItem(STACK_TYPE.LABEL);
		si.node = labelNode;

		var label = new StackLabel(labelNode, node.nextSibling);

		si.obj = label;

		labelStack.push(si);

		return labelNode.nextSibling;
	}

	function doLabel(node) {
		if (node.tokens[1].value.toLowerCase() === 'return') {

			var si = getMatchingStackItem(node);

			if (si) {
				return si.obj.returnNode;
			} else {
				throw Error("return label called without a gosub call");
			}

		} else {
			// will only be called if a label is hit in normal execution,
			// not if label is called via gosub.

			/*
			var si = new StackItem(STACK_TYPE.LABEL);
			si.node = node;

			var label = new StackLabel(node, node.match.nextSibling);

			si.obj = label;

			labelStack.push(si);
			*/

			return node.nextSibling;
		}
	}

	function doNext(node) {

		if (stack.length > 0) {
			var si = stack[stack.length - 1];
			si.obj.currentIndex += si.obj.step;

			if (si.obj.currentIndex >= si.obj.endIndex) {
				stack.pop();
				return node.nextSibling;
			} else {
				setExpressionAssignmentVariable(node.match, si.obj.currentIndex);
				return node.match.nextSibling;
			}
		} else {
			throw Error("Calling next without a loop");
		}
	}

	function doLoop(node) {
		var si = new StackItem(STACK_TYPE.LOOP);
		si.node = node;

		var loop = new StackLoop(node);
		// console.log('loop', loop);

		si.obj = loop;

		if (loop.currentIndex >= loop.endIndex) {
			return node.match.nextSibling;
		} else {
			stack.push(si);
			setExpressionAssignmentVariable(node, loop.currentIndex);
			return node.nextSibling;
		}
	}


	function doIf(node) {
		var booleanResult = null;

		var a = getValueFromToken(node.tokens[1]);
		var op = node.tokens[2].value;
		var b = getValueFromToken(node.tokens[3]);

		// console.log(a, op, b);
		// console.log('comparing', typeof a, typeof b);

		if (typeof a !== typeof b) {
			// reject(makeError(ERROR.INCOMPATIBLE_TYPE_COMPARISON, node));
			throw Error(ERROR.INCOMPATIBLE_TYPE_COMPARISON);
		}

		if (op === '=') {
			if (a === b) {
				booleanResult = true;
			} else {
				booleanResult = false;
			}
		} else if (op === '!=') {
			if (a !== b) {
				booleanResult = true;
			} else {
				booleanResult = false;
			}
		} else if (op === '<=') {
			if (a <= b) {
				booleanResult = true;
			} else {
				booleanResult = false;
			}
		} else if (op === '>=') {
			if (a >= b) {
				booleanResult = true;
			} else {
				booleanResult = false;
			}
		} else if (op === '<') {
			if (a < b) {
				booleanResult = true;
			} else {
				booleanResult = false;
			}
		} else if (op === '>') {
			if (a > b) {
				booleanResult = true;
			} else {
				booleanResult = false;
			}
		}

		setExpressionAssignmentVariable(node, booleanResult ? 1 : 0);

		if (booleanResult && node.tokens.length > 4 && node.tokens[4].type !== TYPE.ASSIGN_OPERATOR) {

			var n = new Node();
			n.type = NODE_TYPE.EXPRESSION;

			var ifTokens = node.tokens.slice(5);
			for (var i = 0; i < ifTokens.length; i++) {
				if (ifTokens[i].type === TYPE.ASSIGN_OPERATOR) {
					break;
				} else {
					n.tokens = n.tokens.concat(ifTokens[i]);
				}
			}

			// n.tokens = n.tokens.concat(node.tokens.slice(5));
			n.nextSibling = node.nextSibling;
			n.parent = node.parent;

			return n;

		} else {
			return node.nextSibling;
		}
	}

	function doExecute(node) {
		var code = [];
		code.push(getValueFromToken(node.tokens[1], [DATA_TYPE.STR]));
		var tokens = getTokenList(code);

		var n = new Node();
		n.type = NODE_TYPE.EXPRESSION;
		n.tokens = tokens;
		n.nextSibling = node.nextSibling;
		n.parent = node.parent;

		return n;
	}

	function doXpos(node) {
		var x = kernal.getCursorPosition().x;
		setExpressionAssignmentVariable(node, x);
		return node.nextSibling;
	}

	function doYpos(node) {
		var y = kernal.getCursorPosition().y;
		setExpressionAssignmentVariable(node, y);
		return node.nextSibling;
	}

	function doPos(node) {
		// console.log(node);

		if (node.children.length !== 2) {
			// throw Error("Wrong number of parameters for movec");
		}

		/*
		if (node.children[0].token.dataType !== DATA_TYPE.INT ||
		    node.children[1].token.dataType !== DATA_TYPE.INT) {
		  throw Error("Parameters for movec must be integers");
		}
		*/

		var x = null;
		var y = null;

		x = getValueFromToken(node.tokens[1], [DATA_TYPE.INT]);
		y = getValueFromToken(node.tokens[2], [DATA_TYPE.INT]);

		kernal.moveCursor(x, y);

		return node.nextSibling;
	}

	function doMath(node, operation) {
		operation = operation.toLowerCase();
		var valueTokens = node.tokens.slice(1);
		var result = getNumberValueFromToken(valueTokens[0]);

		for (var i = 1; i < valueTokens.length; i++) {
			var token = valueTokens[i];

			if (token.type === TYPE.ASSIGN_OPERATOR) {
				break;
			}

			var value = getNumberValueFromToken(token);

			switch (operation) {
			case 'add':
				result += value;
				break;
			case 'subtract':
				result -= value;
				break;
			case 'multiply':
				result *= value;
				break;
			case 'divide':
				result /= value;
				break;
			default:
				break;
			}
		}

		setExpressionAssignmentVariable(node, result);

		return node.nextSibling;
	}

	function doPrin(node) {
		// console.log(node);

		var printed = printNode(node);

		setExpressionAssignmentVariable(node, printed);

		return node.nextSibling;
	}

	function doPrint(node) {
		var printed = printNode(node);

		setExpressionAssignmentVariable(node, printed);

		kernal.moveCursor(0, kernal.getCursorPosition().y + 1);

		return node.nextSibling;
	}

	function printNode(node) {
		var printed = '';

		if (node.children.length < 1) {
			// throw Error("Wrong number of parameters");
		}

		for (var ci = 1; ci < node.tokens.length; ci++) {
			var token = node.tokens[ci];

			// console.log(childNode);
			var tokenValue = getValueFromToken(token, [DATA_TYPE.INT, DATA_TYPE.STR,
        DATA_TYPE.FLOAT
      ], node);

			if (undefined !== tokenValue &&
				null !== tokenValue) {
				tokenValue = '' + tokenValue;
			} else {
				tokenValue = '';
			}

			printed = tokenValue;

			printText(tokenValue);
		}

		return printed;
	}

	function printText(text) {
		kernal.print(text);
	}

	// get assignment from expression node
	function getAssignmentFromExpression(node) {
		var assignmentIdentifier = null;

		for (var i = 0; i < node.tokens.length; i++) {
			if (node.tokens[i].type === TYPE.ASSIGN_OPERATOR) {
				if (i + 1 < node.tokens.length && node.tokens[i + 1].type ===
					TYPE.IDENTIFIER) {
					assignmentIdentifier = node.tokens[i + 1].value;


					// console.log(node.tokens[i+1]);
					break;
				}
			}
		}

		// console.log('assignment', assignmentIdentifier);
		return assignmentIdentifier;
	}

	/*
  // gets list of tokens where first value is
  function getExpressionValue(expressionToken, valueTokens) {
    switch (expressionToken.text) {
      case 'add':
        var total = 0;

        for (var i = 0; i < valueTokens.length; i++) {
          var token = valueTokens[i];

          if (token.type === TYPE.ASSIGN_OPERATOR) {
            break;
          }

          total += token.value;
        }

        return total;

        break;
      case 'input':
        var ins = window.prompt(valueTokens[0].value);



        return ins;

        break;
      default:
        throw error("unknown expression command: ", expressionToken.text);
    }
  }
*/

	function getNumberValueFromToken(token) {
		return getValueFromToken(token, [DATA_TYPE.FLOAT, DATA_TYPE.INT]);
	}

	function getArrayFromAssignmentNode(node) {
		var list = [];

		var inArray = true;
		for (var i = 1; inArray; i++) {
			if (node.tokens[i].dataType !== DATA_TYPE.ARRAY_CLOSER) {
				list.push(getValueFromToken(node.tokens[i]));
			} else {
				inArray = false;
			}
		}

		return list;
	}

	function getValueFromToken(token, dataTypes) {
		dataTypes = dataTypes || [DATA_TYPE.FLOAT, DATA_TYPE.INT, DATA_TYPE.STR];

		if (token.type === TYPE.RESERVED) {
			// console.log('Cannot use reserved word as variable name.', token.value);
			throw Error('Cannot use reserved word as variable name: ' + token.value);
			return;
		}

		if (token.type === TYPE.LITERAL && dataTypes.indexOf(token.dataType) !==
			-1) {

			return token.value;

		} else if (token.type === TYPE.IDENTIFIER) {

			/*if (/\[-?\d+\]$/.test('' + token.value)) {
				// check if token.value is array?
				var matches = token.value.match(/\[(-?\d+)\]$/);
				var index = parseInt(matches[1]);

				var varName = token.value.replace(/(.+\[)-?\d+(\])/, "$1$2");

				return variables[varName][index];
			*/
			if (token.dataType === DATA_TYPE.ARRAY) {
				// console.log('getting value', token);
				var index = getNumberValueFromToken(token.childTokens[0]);
				var varName = token.value.replace(/(.+\[).*(\])/, "$1$2");

				// console.log('getting value', token, index, varName);

				return variables[varName][index];

			} else if (token.value in variables) {
				return variables['' + token.value];
			}

		} else {
			console.log('not found / incompatible type', token);
			throw Error("Incompatible type or variable not found.");
		}
	}


	function getSyntaxTree(tokens) {
		var root = new Node();
		root.token = null;
		root.parent = null;
		root.type = NODE_TYPE.ROOT;

		var currentLine = -1;
		var currentNode = null;

		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i].lineNum !== currentLine) {
				currentNode = root;

				var n = new Node();
				n.tokens.push(tokens[i]);
				n.parent = currentNode;
				n.parent.children.push(n);

				if (n.parent.children.length - 2 >= 0) {
					n.previousSibling = n.parent.children[n.parent.children.length -
						2];
					n.parent.children[n.parent.children.length - 2].nextSibling = n;
				}


				if (n.tokens[0].type === TYPE.RESERVED) {
					if (statementWords.indexOf(n.tokens[0].text.toLowerCase()) !== -1) {
						n.type = NODE_TYPE.STATEMENT;
					} else if (expressionWords.indexOf(n.tokens[0].text.toLowerCase()) !==
						-1) {
						n.type = NODE_TYPE.EXPRESSION;
					}
				} else if (n.tokens[0].type === TYPE.LITERAL || n.tokens[0].dataType ===
					DATA_TYPE.ARRAY_OPENER) {
					n.type = NODE_TYPE.EXPRESSION;
				} else if (n.tokens[0].type === TYPE.IDENTIFIER) {
					// do more to make sure this is an assignment (;)
					n.type = NODE_TYPE.ASSIGNMENT;

					// could check that values match variable type
				}

				currentLine = tokens[i].lineNum;
				currentNode = n;

			} else {
				currentNode.tokens.push(tokens[i]);
			}
		}


		// do matching
		var haveNodes = root.children.length > 0;
		var theNode = root;


		// MATCH LOOPS
		haveNodes = root.children.length > 0;
		theNode = root;

		var loops = [];

		while (haveNodes) {
			if (theNode.children.length > 0) {
				theNode = theNode.children[0];
			} else if (theNode.nextSibling) {
				theNode = theNode.nextSibling;
			} else if (theNode.parent && theNode.parent.nextSibling) {
				theNode = theNode.parent.nextSibling;
			} else {
				haveNodes = false;
				continue;
			}

			// console.log('thenode: ', theNode);
			try {
				if (theNode.type === NODE_TYPE.EXPRESSION &&
					typeof theNode.tokens[0].value === 'string' &&
					theNode.tokens[0].value.toLowerCase() === 'loop') {

					loops.push(theNode);
				}
				if (theNode.type === NODE_TYPE.STATEMENT &&
					typeof theNode.tokens[0].value === 'string' &&
					theNode.tokens[0].value.toLowerCase() === 'next') {

					var matchingLoop = loops.pop();
					matchingLoop.match = theNode;
					theNode.match = matchingLoop;

					// console.log('matchloop', matchingLoop, theNode);
				}
			} catch (e) {
				console.log(theNode);
				throw e;
			}
		}

		// MATCH LABELS
		haveNodes = root.children.length > 0;
		theNode = root;

		var labels = [];

		while (haveNodes) {
			if (theNode.children.length > 0) {
				theNode = theNode.children[0];
			} else if (theNode.nextSibling) {
				theNode = theNode.nextSibling;
			} else if (theNode.parent && theNode.parent.nextSibling) {
				theNode = theNode.parent.nextSibling;
			} else {
				haveNodes = false;
				continue;
			}

			// console.log('thenode: ', theNode);

			if (theNode.type === NODE_TYPE.STATEMENT && theNode.tokens[0].value ===
				':' && theNode.tokens[1].value.toLowerCase() !== 'return') {
				labels.push(theNode);
				labelMap[theNode.tokens[1].value] = theNode;
			}

			/*
			if (theNode.type === NODE_TYPE.STATEMENT && theNode.tokens[0].value ===
			  ':' && theNode.tokens[1].value === 'return') {

			  if (labels.length < 1) {
			    throw Error(":return without a label statement");
			    return;
			  }

			  var matchingLabel = labels.shift();
			  matchingLabel.match = theNode;
			  theNode.match = matchingLabel;

			  // console.log('matchlabel', matchingLabel, theNode);
			}
			*/
		}

		// console.log(root);
		// console.log('labels', labels);
		// console.log(labelMap);
		return root;
	}

	function getTokenList(code) {
		var tokens = [];

		for (var lineNum = 1; lineNum < code.length + 1; lineNum++) {
			var currentLine = code[lineNum - 1];
			// console.log('\n\nworking on line ', lineNum), '\n';
			for (var charIndex = 0; charIndex < currentLine.length; charIndex++) {
				if (currentLine[charIndex] === '') {
					continue;
				}

				var cc = currentLine[charIndex];
				// console.log(charIndex, cc);


				if (/\//.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/\/\/.*/);
					t.text = match[0];
					t.value = match[0];

					t.type = TYPE.COMMENT;

					// console.log(t);
					// tokens.push(t);
					charIndex += t.text.length - 1;
					continue;

				} else if (/:/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/:/);
					t.text = match[0];
					t.value = match[0];

					t.type = TYPE.RESERVED;

					// console.log(t);
					tokens.push(t);

					charIndex += match[0].length - 1;
					continue;

				} else if (/[a-zA-Z]{1}[a-zA-Z0-9]*(\$|%|\[)?/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(
						/[a-zA-Z]{1}[a-zA-Z0-9]*(\[\]|\[(\d+|[a-zA-Z]{1}[a-zA-Z0-9]*[\$%]?)\]|\$|%)?/);
					t.text = match[0];
					t.value = match[0];

					if (statementWords.indexOf(t.text.toLowerCase()) !== -1 ||
						expressionWords.indexOf(t.text.toLowerCase()) !== -1) {
						t.type = TYPE.RESERVED;
					} else {
						t.type = TYPE.IDENTIFIER;

						if (match[2]) {
							t.dataType = DATA_TYPE.ARRAY;

							var it = new Token();
							it.lineNum = t.lineNum;
							it.column = t.column;
							it.text = match[2];
							it.value = match[2];

							if (/\d+/.test(match[0])) {
								it.type = TYPE.LITERAL;
								it.dataType = DATA_TYPE.INT;
							} else {
								it.type = TYPE.IDENTIFIER;
							}

							t.childTokens.push(it);
							// (\d+|[a-zA-Z]{1}[a-zA-Z0-9]*)
							// parse the index or int value and
							// set as children to this token so we can
							// read them later.

							console.log('array index', t);
						}
					}

					tokens.push(t);
					charIndex += t.text.length - 1;
					continue;

				} else if (/[\[\]]/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/[\[\]]/);
					t.text = match[0];

					t.value = match[0];
					t.type = TYPE.LITERAL;

					if (match[0] === '[') {
						t.dataType = DATA_TYPE.ARRAY_OPENER;
					} else {
						t.dataType = DATA_TYPE.ARRAY_CLOSER;
					}

					// console.log(t);
					tokens.push(t);

					charIndex += t.text.length - 1;
					continue;

				} else if (/[0-9]/.test(cc) || /-/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(
						/-?[0-9]+\.[0-9]+|-?[0-9]+/);
					t.text = match[0];

					if (match[0].indexOf('.') !== -1) {
						t.value = parseFloat(match[0]);
					} else {
						t.value = parseInt(match[0]);
					}

					t.type = TYPE.LITERAL;
					t.dataType = DATA_TYPE.INT;

					// console.log(t);
					tokens.push(t);

					charIndex += t.text.length - 1;
					continue;

				} else if (/"/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/".*?"/);
					t.text = match[0];
					t.value = t.text.slice(1, t.text.length - 1);

					t.type = TYPE.LITERAL;
					t.dataType = DATA_TYPE.STR;

					// console.log(t);
					tokens.push(t);

					charIndex += match[0].length - 1;
					continue;

				} else if (/;/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/;/);
					t.text = match[0];
					t.value = match[0];

					t.type = TYPE.ASSIGN_OPERATOR;

					// console.log(t);
					tokens.push(t);

					charIndex += match[0].length - 1;
					continue;

				} else if (/!/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/!=|!/);

					if (match[0] === '!') {
						t.text = match[0];
						t.value = match[0];

						t.type = TYPE.IDENTIFIER;
					} else if (match[0] === '!=') {
						t.text = match[0];
						t.value = match[0];

						t.type = TYPE.COMP_OPERATOR;
					}

					// console.log(t);
					tokens.push(t);

					charIndex += match[0].length - 1;
					continue;

				} else if (/=/.test(cc)) {

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/=/);
					t.text = match[0];
					t.value = match[0];

					t.type = TYPE.COMP_OPERATOR;

					// console.log(t);
					tokens.push(t);

					charIndex += match[0].length - 1;
					continue;

				} else if (/<|>/.test(cc)) {

					// console.log('yep', cc);

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					var match = currentLine.slice(t.column).match(/<=|>=|<|>/);
					//console.log(match);
					t.text = match[0];
					t.value = match[0];

					t.type = TYPE.COMP_OPERATOR;

					// console.log(t);
					tokens.push(t);

					charIndex += match[0].length - 1;
					continue;

				} else if (/\s/.test(cc)) {
					// console.log('space');
					continue;

					/*
					if (/\s+$/.test(currentLine.slice(charIndex))) {
					  charIndex = currentLine.length; // done with line
					  continue;
					}

					var t = new Token();
					t.lineNum = lineNum;
					t.column = charIndex;

					t.text = ' ';
					t.type = TYPE.SPACE;

					console.log(t);
					tokens.push(t);

					continue;
					*/
				}


				console.log('ERROR: UNKNOWN SYMBOL', currentLine[charIndex]);
			}
		}

		return tokens;
	}

	function makeError(type, node) {
		var e = new IError();

		switch (type) {
			// runtime
		case ERROR.INCOMPATIBLE_TYPE_COMPARISON:
			var e = new IError(ERROR.INCOMPATIBLE_TYPE_COMPARISON,
				node.tokens[0].lineNum, node.tokens[0].text);
			// console.log(type, node);
			break;

		}

		return e;
	}

	function IError(message, code, details) {
		this.message = message;
		this.code = code;
		this.details = details;
	}
	IError.prototype.message;
	IError.prototype.code;
	IError.prototype.details;

	return {
		init: init,
		runFile: runFile,
		clearRuntime: clearRuntime,
		printText: printText,
		parseCode: parseCode,
		executeNodeForPromise: executeNodeForPromise,
		getVariables: getVariables,
		setVariable: setVariable,
		getCharFromCode: getCharFromCode
	};

})(kernal);