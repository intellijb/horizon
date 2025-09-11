# horizon-mediapipe-py

## Virtual Environment Setup

Before running this Python project, set up and activate the virtual environment:

```bash
# Create virtual environment if it doesn't exist
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install required packages
pip install opencv-python mediapipe
```

## Project Overview

This is a Python MediaPipe implementation for the Horizon project.

## Development Commands

After activating the virtual environment:

```bash
# Run the main application
python main.py

# Face detection and cropping
python face_crop.py input --output-dir crop_output --visualize

# Face detection with rotation correction and cropping
python face_rotate_crop.py input --output-dir rotate_crop_output --visualize

# Process images with MediaPipe
python process_images.py
```