#!/usr/bin/env bash
set -e

# Frontend
npm install
npm run build

# Backend
cd backend
pip install -r requirements.txt
python seed.py
