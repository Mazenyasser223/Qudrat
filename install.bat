@echo off
echo Installing Qudrat Educational Platform...
echo.

echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing root dependencies
    pause
    exit /b 1
)

echo.
echo Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo Error installing server dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo Error installing client dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo Creating .env file for server...
if not exist "server\.env" (
    copy "server\.env.example" "server\.env"
    echo Created server\.env file. Please edit it with your configuration.
) else (
    echo server\.env already exists.
)

echo.
echo Installation completed successfully!
echo.
echo To start the application:
echo 1. Make sure MongoDB is running
echo 2. Edit server\.env with your configuration
echo 3. Run: npm run dev
echo.
pause
