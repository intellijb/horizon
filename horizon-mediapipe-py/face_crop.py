#!/usr/bin/env python3
"""
Face detection and cropping utility using MediaPipe.
Detects faces in images from input directory and saves cropped faces to output directory.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Tuple, Union
import math
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Constants for visualization
MARGIN = 10  # pixels
ROW_SIZE = 10  # pixels
FONT_SIZE = 1
FONT_THICKNESS = 1
TEXT_COLOR = (255, 0, 0)  # red

# Face detection parameters
DETECTION_CONFIDENCE = 0.5
CROP_PADDING = 20  # pixels to add around face bounding box


def _normalized_to_pixel_coordinates(
    normalized_x: float, normalized_y: float, image_width: int,
    image_height: int) -> Union[None, Tuple[int, int]]:
    """Converts normalized value pair to pixel coordinates."""

    # Checks if the float value is between 0 and 1.
    def is_valid_normalized_value(value: float) -> bool:
        return (value > 0 or math.isclose(0, value)) and (value < 1 or
                                                          math.isclose(1, value))

    if not (is_valid_normalized_value(normalized_x) and
            is_valid_normalized_value(normalized_y)):
        # TODO: Draw coordinates even if it's outside of the image bounds.
        return None
    x_px = min(math.floor(normalized_x * image_width), image_width - 1)
    y_px = min(math.floor(normalized_y * image_height), image_height - 1)
    return x_px, y_px


def visualize(
    image,
    detection_result
) -> np.ndarray:
    """Draws bounding boxes and keypoints on the input image and return it.
    Args:
        image: The input RGB image.
        detection_result: The list of all "Detection" entities to be visualize.
    Returns:
        Image with bounding boxes.
    """
    annotated_image = image.copy()
    height, width, _ = image.shape

    for detection in detection_result.detections:
        # Draw bounding_box
        bbox = detection.bounding_box
        start_point = bbox.origin_x, bbox.origin_y
        end_point = bbox.origin_x + bbox.width, bbox.origin_y + bbox.height
        cv2.rectangle(annotated_image, start_point, end_point, TEXT_COLOR, 3)

        # Draw keypoints
        for keypoint in detection.keypoints:
            keypoint_px = _normalized_to_pixel_coordinates(keypoint.x, keypoint.y,
                                                           width, height)
            color, thickness, radius = (0, 255, 0), 2, 2
            cv2.circle(annotated_image, keypoint_px, thickness, color, radius)

        # Draw label and score
        category = detection.categories[0]
        category_name = category.category_name
        category_name = '' if category_name is None else category_name
        probability = round(category.score, 2)
        result_text = category_name + ' (' + str(probability) + ')'
        text_location = (MARGIN + bbox.origin_x,
                         MARGIN + ROW_SIZE + bbox.origin_y)
        cv2.putText(annotated_image, result_text, text_location, cv2.FONT_HERSHEY_PLAIN,
                    FONT_SIZE, TEXT_COLOR, FONT_THICKNESS)

    return annotated_image


def crop_face(image: np.ndarray, bbox, padding: int = CROP_PADDING) -> np.ndarray:
    """Crop face from image based on bounding box with padding.
    
    Args:
        image: Input image
        bbox: Bounding box from detection
        padding: Extra pixels to add around the face
    
    Returns:
        Cropped face image
    """
    height, width = image.shape[:2]
    
    # Calculate crop coordinates with padding
    x1 = max(0, bbox.origin_x - padding)
    y1 = max(0, bbox.origin_y - padding)
    x2 = min(width, bbox.origin_x + bbox.width + padding)
    y2 = min(height, bbox.origin_y + bbox.height + padding)
    
    # Crop the face
    cropped = image[y1:y2, x1:x2]
    
    return cropped


def process_image(detector, image_path: Path, output_dir: Path, visualize_results: bool = False, padding: int = CROP_PADDING):
    """Process a single image: detect faces and save cropped faces.
    
    Args:
        detector: MediaPipe face detector
        image_path: Path to input image
        output_dir: Directory to save cropped faces
        visualize_results: Whether to save visualized detection results
    """
    # Read image
    image = mp.Image.create_from_file(str(image_path))
    
    # Convert to numpy array for OpenCV operations
    image_np = cv2.imread(str(image_path))
    if image_np is None:
        print(f"Error reading image: {image_path}")
        return
    
    # Detect faces
    detection_result = detector.detect(image)
    
    if not detection_result.detections:
        print(f"No faces detected in {image_path.name}")
        return
    
    print(f"Found {len(detection_result.detections)} face(s) in {image_path.name}")
    
    # Save visualization if requested (in a separate visualizations directory)
    if visualize_results:
        vis_dir = output_dir / "visualizations"
        vis_dir.mkdir(parents=True, exist_ok=True)
        # Convert BGR to RGB for visualization
        image_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        annotated = visualize(image_rgb, detection_result)
        # Convert back to BGR for saving
        annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
        vis_path = vis_dir / f"{image_path.stem}_detected.jpg"
        cv2.imwrite(str(vis_path), annotated_bgr)
        print(f"  Saved visualization to {vis_path}")
    
    # Crop and save the first detected face with the same name as the original
    if detection_result.detections:
        # Take the first face (highest confidence)
        detection = detection_result.detections[0]
        bbox = detection.bounding_box
        cropped_face = crop_face(image_np, bbox, padding)
        
        # Save cropped face with same name as original
        crop_path = output_dir / image_path.name
        cv2.imwrite(str(crop_path), cropped_face)
        
        # Get confidence score
        confidence = detection.categories[0].score if detection.categories else 0.0
        print(f"  Saved cropped face (confidence: {confidence:.2f}) to {crop_path}")
        
        # If there are multiple faces, save the additional ones with a suffix
        if len(detection_result.detections) > 1:
            for i, detection in enumerate(detection_result.detections[1:], 1):
                bbox = detection.bounding_box
                cropped_face = crop_face(image_np, bbox, padding)
                
                # Save additional faces with suffix
                crop_filename = f"{image_path.stem}_face_{i}.jpg"
                crop_path = output_dir / crop_filename
                cv2.imwrite(str(crop_path), cropped_face)
                
                confidence = detection.categories[0].score if detection.categories else 0.0
                print(f"  Saved additional face {i} (confidence: {confidence:.2f}) to {crop_path}")


def main():
    parser = argparse.ArgumentParser(description='Detect and crop faces from images')
    parser.add_argument('input_dir', type=str, help='Input directory containing images')
    parser.add_argument('--output-dir', type=str, default='crop_output',
                        help='Output directory for cropped faces (default: crop_output)')
    parser.add_argument('--model-path', type=str, 
                        default='blaze_face_short_range.tflite',
                        help='Path to face detection model (default: blaze_face_short_range.tflite)')
    parser.add_argument('--confidence', type=float, default=DETECTION_CONFIDENCE,
                        help=f'Minimum detection confidence (default: {DETECTION_CONFIDENCE})')
    parser.add_argument('--padding', type=int, default=CROP_PADDING,
                        help=f'Padding pixels around face crops (default: {CROP_PADDING})')
    parser.add_argument('--visualize', action='store_true',
                        help='Save visualization images with bounding boxes')
    parser.add_argument('--extensions', nargs='+', 
                        default=['jpg', 'jpeg', 'png', 'bmp'],
                        help='Image file extensions to process')
    
    args = parser.parse_args()
    
    # Validate input directory
    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
    
    if not input_dir.is_dir():
        print(f"Error: '{input_dir}' is not a directory")
        sys.exit(1)
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")
    
    # Check if model file exists
    if not os.path.exists(args.model_path):
        print(f"Error: Model file '{args.model_path}' not found")
        print("Please download a face detection model from:")
        print("https://developers.google.com/mediapipe/solutions/vision/face_detector#models")
        sys.exit(1)
    
    # Initialize face detector
    base_options = python.BaseOptions(model_asset_path=args.model_path)
    options = vision.FaceDetectorOptions(
        base_options=base_options,
        min_detection_confidence=args.confidence
    )
    detector = vision.FaceDetector.create_from_options(options)
    
    # Find all image files
    image_files = []
    for ext in args.extensions:
        image_files.extend(input_dir.glob(f'*.{ext}'))
        image_files.extend(input_dir.glob(f'*.{ext.upper()}'))
    
    if not image_files:
        print(f"No image files found in {input_dir} with extensions: {args.extensions}")
        sys.exit(1)
    
    print(f"Found {len(image_files)} image(s) to process")
    print("-" * 50)
    
    # Process each image
    for image_path in sorted(image_files):
        try:
            process_image(detector, image_path, output_dir, args.visualize, args.padding)
        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            continue
    
    print("-" * 50)
    print(f"Processing complete. Results saved to {output_dir}")


if __name__ == "__main__":
    main()