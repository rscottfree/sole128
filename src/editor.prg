// save code in memory but scroll/update screen

CLS

[]; M[]
0; P%

// MAIN ROUTINE
:GETKEY
//DEBUG M[]

GET; A
CHAR A; A$
// PRIN A
IF A = -1 THEN GOTO GOLEFT
IF A = -2 THEN GOTO GOUP
IF A = -3 THEN GOTO GORIGHT
IF A = -4 THEN GOTO GODOWN
IF A = 8 THEN GOTO DELETE
IF A = 13 THEN GOTO GETKEY

YPOS; Y%
XPOS; X%
YPOSMAX; YMAX%
XPOSMAX; XMAX%
SUBTRACT XMAX% 1; XMAX%
SUBTRACT YMAX% 1; YMAX%
IF Y% = YMAX%; ISYMAX%
IF X% = XMAX%; ISXMAX%
ADD ISYMAX% ISXMAX%; ENDED%
IF ENDED% = 2; ENDED%

// PRINT THE TYPED CHARACTER
POKE "B" X% Y% A$

// IF THE CURSOR IS AT THE VERY BOTTOM RIGHT CORNER
// THEN DON'T ADVANCE THE CURSOR
IF ENDED% = 0 THEN GOSUB ADVANCECURSOR
IF ENDED% = 1 THEN GOSUB STORECURRENTLINE

// IF Y CHANGES THEN WE NEED TO STORE THE PREVIOUS LINE
// OTHERWISE STORE THE CURRENT LINE
IF ISXMAX% = 1 THEN GOSUB STOREPREVIOUSLINE
IF ISXMAX% = 0 THEN GOSUB STORECURRENTLINE

// **************
GOTO GETKEY
// END MAIN ROUTINE

:DRAWSCREEN
DEBUG "DRAWSCREEN"
YPOSMAX; YMAX%
YPOS; SAVEY%
DEBUG SAVEY%
XPOS; SAVEX%
CLS
LOOP 0 TO YMAX%; I%
POS 0 I%
ADD I% P%; PI%
PRIN M[PI%]
NEXT I%
POS SAVEX% SAVEY%
:RETURN // DRAWSCREEN

:STORECURRENTLINE
YPOS; Y%
ADD Y% P%; YP%
SCREENLINE Y%; M[YP%]
:RETURN

:STOREPREVIOUSLINE
YPOS; Y%
SUBTRACT Y% 1; Y%
ADD Y% P%; YP%
SCREENLINE Y%; M[YP%]
:RETURN

:DELETE
XPOS; X%
YPOS; Y%
ADD X% Y%; XY%
IF XY% = 0 THEN GOTO GETKEY

SUBTRACT X% 1; X%
POS X% Y%
PRIN " "
POS X% Y%
ADD Y% P%; YP%;
SCREENLINE Y%; M[YP%]
GOTO GETKEY

:GOLEFT
XPOS; X%
YPOS; Y%
SUBTRACT X% 1; X%
IF X% < 0 THEN GOTO GETKEY
POS X% Y%
GOTO GETKEY

:GOUP
XPOS; X%
YPOS; Y%
SUBTRACT Y% 1; Y%
IF Y% < 0 THEN GOSUB SCROLLUP
IF Y% < 0 THEN GOTO GETKEY
POS X% Y%
GOTO GETKEY

:GORIGHT
XPOS; X%
YPOS; Y%
ADD X% 1; X%
XPOSMAX; XMAX%
IF X% >= XMAX% THEN GOTO GETKEY
POS X% Y%
GOTO GETKEY

:GODOWN
XPOS; X%
YPOS; Y%
ADD Y% 1; Y%
YPOSMAX; YMAX%
IF Y% >= YMAX% THEN GOSUB SCROLLDOWN
IF Y% >= YMAX% THEN GOTO GETKEY
POS X% Y%
GOTO GETKEY

:ADVANCECURSOR
YPOS; Y%
XPOS; X%
ADD X% 1; X%
POS X% Y%
:RETURN

:SCROLLDOWN
ADD P% 1; P%
DEBUG P%
GOSUB DRAWSCREEN
:RETURN // SCROLLDOWN

:SCROLLUP
IF P% > 0; PSTEP% 
SUBTRACT P% PSTEP%; P%
DEBUG P%
DEBUG PSTEP%
IF PSTEP% = 1 THEN GOSUB DRAWSCREEN
:RETURN
