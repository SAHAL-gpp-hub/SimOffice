#!/bin/bash
set -euo pipefail

echo "--- Installing Docker and gVisor (runsc) ---"

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed."
fi

# 2. Install gVisor (runsc)
echo "Installing gVisor..."
(
  set -e
  ARCH=$(uname -m)
  URL=https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}
  wget ${URL}/runsc ${URL}/runsc.sha512 \
    ${URL}/containerd-shim-runsc-v1 ${URL}/containerd-shim-runsc-v1.sha512
  sha512sum -c runsc.sha512 \
    -c containerd-shim-runsc-v1.sha512
  rm -f *.sha512
  chmod a+rx runsc containerd-shim-runsc-v1
  sudo mv runsc containerd-shim-runsc-v1 /usr/local/bin
)

# 3. Configure Docker to use runsc
echo "Configuring Docker daemon..."
sudo runsc install

# Restart docker to apply changes
echo "Restarting Docker daemon..."
sudo systemctl restart docker

echo "--- Installation Complete ---"
echo "Verify installation by running: sudo docker run --rm --runtime=runsc alpine uname -a"
