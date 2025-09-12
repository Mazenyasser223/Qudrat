#!/bin/bash

echo "Installing Qudrat Educational Platform..."
echo

echo "Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error installing root dependencies"
    exit 1
fi

echo
echo "Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Error installing server dependencies"
    exit 1
fi

echo
echo "Installing client dependencies..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo "Error installing client dependencies"
    exit 1
fi

cd ..

echo
echo "Creating .env file for server..."
if [ ! -f "server/.env" ]; then
    cp "server/.env.example" "server/.env"
    echo "Created server/.env file. Please edit it with your configuration."
else
    echo "server/.env already exists."
fi

echo
echo "Installation completed successfully!"
echo
echo "To start the application:"
echo "1. Make sure MongoDB is running"
echo "2. Edit server/.env with your configuration"
echo "3. Run: npm run dev"
echo
