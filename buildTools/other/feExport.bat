@rem (1) Move this file to the equivilant of your G5expot directory, 
@rem (2) edit those 2 lines below with your paths for G5export, and 
@rem (3) be sure to change userXXXX:pwXXXX to yours
rem
set CVSROOT=:pserver:userXXXX:pwXXXX@ndscvs.biperf.com:2500/usr/local/ndscvsroot
cd \altiris\awork\sandboxes\G5export
rmdir /s/q fe
pause
call cvs export -r HEAD -d fe products/penta-g/src/fe
cd fe
pause
call ant -f buildTools\other\fe.util.xml fe.CRLF
pause
