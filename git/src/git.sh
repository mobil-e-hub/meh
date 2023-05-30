echo "Pulling repository..."
cd $MEH
git pull

echo "sim: Installing dependencies..."
cd $MEH/sim
npm install

echo "opt: Installing dependencies..."
cd $MEH/opt
[ -d $MEH/opt/.venv ] && python3 -m venv $MEH/opt/.venv
source .venv/bin/activate
pip install -r requirements.txt

echo "Done!"