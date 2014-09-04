RGB: 55, 48, 131 -- background
115, 107, 190 -- border / foreground


CLS
LOOP 0 TO 10; a
PRINT a
SLEEP 200
NEXT a



:GETS
GET; A$
CHARCODE A$; AC
IF A$ = "" THEN GOTO GETS
IF AC <= 13 THEN GOTO GETS
IF A$ = "x" THEN END
PRIN A$
GOTO GETS





[1 2]; a[]
3; a[2]
[3 4]; a2[]
5; a2[1]
print a2[]
a[1]; b
print b
a[]; c[]
print c[]



4; b%
[1 2 "3" b%]; a[]
print a[]
5; a[4]
print a[]
print a[0]
length a[]; b
print b





input "int"; b%
[1 2 "cheese" b%]; a[]
print a[3]



input "enter 0 for goto okay"; a
if a = 0 then goto 5
if a = 1 then print "good job"
end
print a
1; a
print a
goto 2





loop 0 to 3; x
loop 0 to 3; y
print x y
next y
next x



2; b%
[1 "hi" b%]; a[]
print a[]
print a[1]



a = 1
b = a
print b






print "first"
gosub doSomething
print "last"
end

:doSomething
gosub doMore
print "doing something"
:return

:doMore
print "doing more"
:return doMore





print "first"
input "do more"; a$
if a$ = "y" then gosub doSomething
print "last"
end

:doSomething
gosub doMore
print "doing something"
:return doSomething

:doMore
print "doing more"
:return doMore




2; starti
10; endi
2; st
add endi starti; endi
loop starti to endi step st; a
print a " bears!"
next




loop 0 to 10; a
print a
next




input "what is 1 + 1"; a
if a = 2.0 then print "correct"
if a != 2.0 then print "incorrect"

input "what is 1 + 1"; a
if a = 2 then print "correct"
if a != 2 then print "incorrect"




2; a
2; b
if a = b then print "equal",
if a != b then print "not equal"
if a < b then print "less than"
if a > b then print "greater than"
if a <= b then print "less than equal to"
if a >= b then print "greater than equal to"




add 1 2 3
print "add " !

subtract 1 2 3
print "subtract " !

multiply 1 2 3
print "multiply " !

divide 12 2 3
print "divide " !





1; a
print a
if a = "1" then print "yep"