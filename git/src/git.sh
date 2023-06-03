echo "Pulling repository..."
cd $MEH
git pull

echo "sim: Installing dependencies..."
cd $MEH/sim
npm install

echo "opt: Installing dependencies..."
cd $MEH/opt
if [ -d $MEH/opt/.venv ]
then
    echo "venv already exists."
else
    python3 -m venv $MEH/opt/.venv
fi
source .venv/bin/activate
pip install -r requirements.txt

echo "Done!"