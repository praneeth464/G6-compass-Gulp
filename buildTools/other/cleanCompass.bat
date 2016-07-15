:: Batch Script to compass watch all Compass Directories
setlocal EnableDelayedExpansion
::Specifiy which locations to watch ONE location per line, no comments.
set file=%~dp0\locations.txt
::Iterate watch locations
FOR /F %%i IN (%file%) DO (
	set watchLocation=%%i
	::Call watch and send it current watch location
	start cleanDirectory.CMD %watchLocation%
)

EXIT