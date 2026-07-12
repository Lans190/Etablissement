#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

# NOTE: Les migrations sont lancées via la "Start Command" de Render,
# PAS ici, car la base de données interne n'est pas accessible pendant le build.
