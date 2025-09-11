#!/usr/bin/env python3
"""
Face detection, rotation correction, and cropping utility using MediaPipe.
Detects faces, corrects rotation based on face landmarks, and saves cropped faces.
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
        return None
    x_px = min(math.floor(normalized_x * image_width), image_width - 1)
    y_px = min(math.floor(normalized_y * image_height), image_height - 1)
    return x_px, y_px


def calculate_face_rotation(landmarks, image_width: int, image_height: int, verbose: bool = False) -> float:
    """Calculate face rotation angle to align T-axis (eyes horizontal, nose-mouth vertical).
    
    Args:
        landmarks: Face landmarks from MediaPipe (list of landmarks)
        image_width: Width of the image
        image_height: Height of the image
        verbose: Enable detailed logging
    
    Returns:
        Rotation angle in degrees (positive = clockwise)
    """
    if not landmarks or len(landmarks) < 468:
        if verbose:
            print("    ❌ Insufficient landmarks for rotation calculation")
        return 0.0
    
    if verbose:
        print("    🔍 Analyzing T-axis landmarks:")
    
    # Key landmark indices for T-axis analysis
    left_eye_center = landmarks[159]   # Left eye center
    right_eye_center = landmarks[386]  # Right eye center
    nose_tip = landmarks[1]           # Nose tip
    nose_bottom = landmarks[2]        # Nose bottom
    mouth_center = landmarks[13]      # Upper lip center
    chin = landmarks[175]             # Chin center
    
    # Convert normalized coordinates to pixels
    left_eye_px = _normalized_to_pixel_coordinates(
        left_eye_center.x, left_eye_center.y, image_width, image_height)
    right_eye_px = _normalized_to_pixel_coordinates(
        right_eye_center.x, right_eye_center.y, image_width, image_height)
    nose_tip_px = _normalized_to_pixel_coordinates(
        nose_tip.x, nose_tip.y, image_width, image_height)
    nose_bottom_px = _normalized_to_pixel_coordinates(
        nose_bottom.x, nose_bottom.y, image_width, image_height)
    mouth_px = _normalized_to_pixel_coordinates(
        mouth_center.x, mouth_center.y, image_width, image_height)
    chin_px = _normalized_to_pixel_coordinates(
        chin.x, chin.y, image_width, image_height)
    
    if not left_eye_px or not right_eye_px:
        if verbose:
            print("    ❌ Could not convert eye coordinates to pixels")
        return 0.0
    
    if verbose:
        print(f"    👁️  Left Eye Center:  ({left_eye_px[0]:4.0f}, {left_eye_px[1]:4.0f})")
        print(f"    👁️  Right Eye Center: ({right_eye_px[0]:4.0f}, {right_eye_px[1]:4.0f})")
        if nose_tip_px:
            print(f"    👃 Nose Tip:         ({nose_tip_px[0]:4.0f}, {nose_tip_px[1]:4.0f})")
        if nose_bottom_px:
            print(f"    👃 Nose Bottom:      ({nose_bottom_px[0]:4.0f}, {nose_bottom_px[1]:4.0f})")
        if mouth_px:
            print(f"    👄 Mouth Center:     ({mouth_px[0]:4.0f}, {mouth_px[1]:4.0f})")
        if chin_px:
            print(f"    🦲 Chin:             ({chin_px[0]:4.0f}, {chin_px[1]:4.0f})")
    
    # Calculate horizontal line between eyes
    dx = right_eye_px[0] - left_eye_px[0]
    dy = right_eye_px[1] - left_eye_px[1]
    eye_distance = math.sqrt(dx*dx + dy*dy)
    
    # Calculate rotation angle needed to make eyes horizontal (dy = 0)
    angle = math.degrees(math.atan2(dy, dx))
    
    if verbose:
        print(f"    📏 Eye separation: dx={dx:6.1f}px, dy={dy:6.1f}px, distance={eye_distance:.1f}px")
        print(f"    📐 Current T-axis rotation: {angle:+6.1f}° from horizontal")
        print(f"    🔄 Correction needed: {angle:+6.1f}° (same angle) to align eyes horizontally")
        
        # Calculate vertical alignment check
        if nose_tip_px and mouth_px:
            nose_mouth_dx = mouth_px[0] - nose_tip_px[0]
            nose_mouth_dy = mouth_px[1] - nose_tip_px[1]
            vertical_angle = math.degrees(math.atan2(nose_mouth_dx, nose_mouth_dy))
            print(f"    📏 Nose-Mouth vertical alignment: {vertical_angle:+6.1f}° from vertical")
    
    return angle


def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    """Rotate image by given angle while keeping all content visible.
    
    Args:
        image: Input image
        angle: Rotation angle in degrees (positive = clockwise)
    
    Returns:
        Rotated image
    """
    if abs(angle) < 1.0:  # Skip rotation for very small angles
        return image
    
    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    
    # Get rotation matrix (OpenCV rotates counterclockwise for positive angles)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    
    # Calculate new image dimensions to fit the rotated image
    cos_angle = abs(rotation_matrix[0, 0])
    sin_angle = abs(rotation_matrix[0, 1])
    
    new_width = int((height * sin_angle) + (width * cos_angle))
    new_height = int((height * cos_angle) + (width * sin_angle))
    
    # Adjust translation to center the image
    rotation_matrix[0, 2] += (new_width / 2) - center[0]
    rotation_matrix[1, 2] += (new_height / 2) - center[1]
    
    # Perform rotation
    rotated = cv2.warpAffine(image, rotation_matrix, (new_width, new_height),
                            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                            borderValue=(0, 0, 0))
    
    return rotated


def visualize(
    image,
    detection_result
) -> np.ndarray:
    """Draws bounding boxes and keypoints on the input image and return it."""
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
            if keypoint_px:
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
    """Crop face from image based on bounding box with padding."""
    height, width = image.shape[:2]
    
    # Calculate crop coordinates with padding
    x1 = max(0, bbox.origin_x - padding)
    y1 = max(0, bbox.origin_y - padding)
    x2 = min(width, bbox.origin_x + bbox.width + padding)
    y2 = min(height, bbox.origin_y + bbox.height + padding)
    
    # Crop the face
    cropped = image[y1:y2, x1:x2]
    
    return cropped


def process_image(face_detector, face_landmarker, image_path: Path, output_dir: Path, 
                 visualize_results: bool = False, padding: int = CROP_PADDING, verbose: bool = False):
    """Process a single image: detect faces, correct rotation, and save cropped faces."""
    
    # Read image
    image_np = cv2.imread(str(image_path))
    if image_np is None:
        print(f"Error reading image: {image_path}")
        return
    
    original_height, original_width = image_np.shape[:2]
    
    # Create MediaPipe image for face detection
    mp_image = mp.Image.create_from_file(str(image_path))
    
    # Detect faces first
    face_detection_result = face_detector.detect(mp_image)
    
    if not face_detection_result.detections:
        print(f"No faces detected in {image_path.name}")
        return
    
    print(f"Found {len(face_detection_result.detections)} face(s) in {image_path.name}")
    
    # Detect landmarks for rotation calculation
    landmark_result = face_landmarker.detect(mp_image)
    
    rotation_angle = 0.0
    if landmark_result.face_landmarks and len(landmark_result.face_landmarks) > 0:
        # Use the first face's landmarks
        landmarks = landmark_result.face_landmarks[0]
        rotation_angle = calculate_face_rotation(
            landmarks, original_width, original_height, verbose)
        if verbose:
            print(f"  📊 Final rotation analysis complete")
        else:
            print(f"  Detected rotation: {rotation_angle:.1f}°")
    
    # Rotate the image if necessary
    corrected_image = image_np
    if abs(rotation_angle) > 1.0:
        corrected_image = rotate_image(image_np, rotation_angle)
        print(f"  Applied rotation correction: {rotation_angle:.1f}°")
        
        # Re-detect faces on the corrected image
        corrected_mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=cv2.cvtColor(corrected_image, cv2.COLOR_BGR2RGB)
        )
        face_detection_result = face_detector.detect(corrected_mp_image)
        
        if not face_detection_result.detections:
            print(f"  Warning: No faces detected after rotation correction")
            return
    
    # Save visualization if requested
    if visualize_results:
        vis_dir = output_dir / "visualizations"
        vis_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert BGR to RGB for visualization
        image_rgb = cv2.cvtColor(corrected_image, cv2.COLOR_BGR2RGB)
        annotated = visualize(image_rgb, face_detection_result)
        # Convert back to BGR for saving
        annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
        
        vis_path = vis_dir / f"{image_path.stem}_corrected.jpg"
        cv2.imwrite(str(vis_path), annotated_bgr)
        print(f"  Saved visualization to {vis_path}")
    
    # Crop and save the first detected face
    if face_detection_result.detections:
        # Take the first face (highest confidence)
        detection = face_detection_result.detections[0]
        bbox = detection.bounding_box
        cropped_face = crop_face(corrected_image, bbox, padding)
        
        # Save cropped face with same name as original
        crop_path = output_dir / image_path.name
        cv2.imwrite(str(crop_path), cropped_face)
        
        # Get confidence score
        confidence = detection.categories[0].score if detection.categories else 0.0
        print(f"  Saved corrected cropped face (confidence: {confidence:.2f}) to {crop_path}")
        
        # If there are multiple faces, save the additional ones with a suffix
        if len(face_detection_result.detections) > 1:
            for i, detection in enumerate(face_detection_result.detections[1:], 1):
                bbox = detection.bounding_box
                cropped_face = crop_face(corrected_image, bbox, padding)
                
                # Save additional faces with suffix
                crop_filename = f"{image_path.stem}_face_{i}.jpg"
                crop_path = output_dir / crop_filename
                cv2.imwrite(str(crop_path), cropped_face)
                
                confidence = detection.categories[0].score if detection.categories else 0.0
                print(f"  Saved additional face {i} (confidence: {confidence:.2f}) to {crop_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Detect faces, correct rotation, and crop faces from images')
    parser.add_argument('input_dir', type=str, help='Input directory containing images')
    parser.add_argument('--output-dir', type=str, default='crop_output',
                        help='Output directory for cropped faces (default: crop_output)')
    parser.add_argument('--face-model-path', type=str, 
                        default='blaze_face_short_range.tflite',
                        help='Path to face detection model')
    parser.add_argument('--landmark-model-path', type=str,
                        default='face_landmarker_v2_with_blendshapes.task',
                        help='Path to face landmark model')
    parser.add_argument('--confidence', type=float, default=DETECTION_CONFIDENCE,
                        help=f'Minimum detection confidence (default: {DETECTION_CONFIDENCE})')
    parser.add_argument('--padding', type=int, default=CROP_PADDING,
                        help=f'Padding pixels around face crops (default: {CROP_PADDING})')
    parser.add_argument('--visualize', action='store_true',
                        help='Save visualization images with bounding boxes')
    parser.add_argument('--verbose', action='store_true',
                        help='Enable detailed logging of landmark detection and rotation calculation')
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
    
    # Check if model files exist
    if not os.path.exists(args.face_model_path):
        print(f"Error: Face detection model '{args.face_model_path}' not found")
        sys.exit(1)
    
    if not os.path.exists(args.landmark_model_path):
        print(f"Error: Face landmark model '{args.landmark_model_path}' not found")
        sys.exit(1)
    
    # Initialize face detector
    face_base_options = python.BaseOptions(model_asset_path=args.face_model_path)
    face_options = vision.FaceDetectorOptions(
        base_options=face_base_options,
        min_detection_confidence=args.confidence
    )
    face_detector = vision.FaceDetector.create_from_options(face_options)
    
    # Initialize face landmarker
    landmark_base_options = python.BaseOptions(model_asset_path=args.landmark_model_path)
    landmark_options = vision.FaceLandmarkerOptions(
        base_options=landmark_base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    face_landmarker = vision.FaceLandmarker.create_from_options(landmark_options)
    
    # Find all image files
    image_files = []
    for ext in args.extensions:
        image_files.extend(input_dir.glob(f'*.{ext}'))
        image_files.extend(input_dir.glob(f'*.{ext.upper()}'))
    
    if not image_files:
        print(f"No image files found in {input_dir} with extensions: {args.extensions}")
        sys.exit(1)
    
    print(f"Found {len(image_files)} image(s) to process")
    print("-" * 60)
    
    # Process each image
    for image_path in sorted(image_files):
        try:
            process_image(face_detector, face_landmarker, image_path, output_dir, 
                         args.visualize, args.padding, args.verbose)
        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            continue
    
    print("-" * 60)
    print(f"Processing complete. Results saved to {output_dir}")


if __name__ == "__main__":
    main()