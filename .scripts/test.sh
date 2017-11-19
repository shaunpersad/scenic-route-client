#!/usr/bin/env bash
docker-compose up --build --abort-on-container-exit --remove-orphans --force-recreate
docker-compose down --remove-orphans