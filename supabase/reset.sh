#!/bin/bash

echo "WARNING: This will remove all containers and container data. This action cannot be undone!"
echo "NOTE: Your .env file will be preserved unless you choose to reset it."
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo    # Move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operation cancelled."
    exit 1
fi

echo "Stopping and removing all containers..."
docker compose -f docker-compose.yml -f ./dev/docker-compose.dev.yml down -v --remove-orphans

echo "Cleaning up bind-mounted directories..."
BIND_MOUNTS=(
  "./volumes/db/data"
)

for DIR in "${BIND_MOUNTS[@]}"; do
  if [ -d "$DIR" ]; then
    echo "Deleting $DIR..."
    rm -rf "$DIR"
  else
    echo "Directory $DIR does not exist. Skipping bind mount deletion step..."
  fi
done

echo "Checking .env file..."
if [ -f ".env" ]; then
  echo "Your .env file exists and will be preserved."
  read -p "Do you want to reset the .env file to defaults? (y/N) " -n 1 -r
  echo    # Move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Backing up current .env file..."
    cp .env .env.backup
    echo "Resetting .env file to defaults..."
    if [ -f ".env.example" ]; then
      cp .env.example .env
      echo ".env file reset from .env.example"
    else
      echo "ERROR: .env.example file not found. Cannot reset .env file."
      echo "Your original .env file has been backed up as .env.backup"
    fi
  else
    echo ".env file preserved."
  fi
else
  echo "No .env file found. Creating from .env.example..."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo ".env file created from .env.example"
  else
    echo "ERROR: .env.example file not found. Cannot create .env file."
    echo "You will need to create the .env file manually."
  fi
fi

echo "Cleanup complete!"