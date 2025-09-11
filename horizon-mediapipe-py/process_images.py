#!/usr/bin/env python3
"""
Complete pipeline to process images through MediaPipe Face Mesh
and generate golden ratio analysis with human-friendly interpretations.
"""

import cv2
import mediapipe as mp
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np

# Import our analysis modules
import golden
import golden_final


class FaceImageProcessor:
    def __init__(self, output_dir: str = "landmarks"):
        """Initialize MediaPipe Face Mesh processor."""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,  # Include iris landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def process_image(self, image_path: str) -> Optional[Dict]:
        """Process a single image to extract face landmarks."""
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                print(f"  ✗ Could not read image: {image_path}")
                return None
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process with MediaPipe
            results = self.face_mesh.process(image_rgb)
            
            if not results.multi_face_landmarks:
                print(f"  ✗ No face detected in: {image_path}")
                return None
            
            # Get first face landmarks
            face_landmarks = results.multi_face_landmarks[0]
            
            # Convert to list of dictionaries
            landmarks_list = []
            for landmark in face_landmarks.landmark:
                landmarks_list.append({
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility if hasattr(landmark, 'visibility') else 0.0,
                    'presence': landmark.presence if hasattr(landmark, 'presence') else 1.0
                })
            
            # Get blendshapes if available
            blendshapes_list = []
            if results.multi_face_blendshapes:
                for blendshape in results.multi_face_blendshapes[0]:
                    blendshapes_list.append({
                        'category_name': blendshape.category_name if hasattr(blendshape, 'category_name') else str(blendshape.index),
                        'score': blendshape.score
                    })
            
            return {
                'face_landmarks': [landmarks_list],
                'face_blendshapes': [blendshapes_list] if blendshapes_list else [],
                'image_width': image.shape[1],
                'image_height': image.shape[0],
                'source_image': image_path
            }
            
        except Exception as e:
            print(f"  ✗ Error processing {image_path}: {str(e)}")
            return None
    
    def save_landmarks(self, landmarks_data: Dict, image_name: str) -> str:
        """Save landmarks to JSON file."""
        output_path = self.output_dir / f"{image_name}.landmark"
        with open(output_path, 'w') as f:
            json.dump(landmarks_data, f, indent=2)
        return str(output_path)
    
    def process_directory(self, input_dir: str, extensions: List[str] = None):
        """Process all images in a directory."""
        if extensions is None:
            extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.webp']
        
        input_path = Path(input_dir)
        if not input_path.exists():
            print(f"Input directory does not exist: {input_dir}")
            return
        
        # Find all image files
        image_files = []
        for ext in extensions:
            image_files.extend(input_path.glob(f"*{ext}"))
            image_files.extend(input_path.glob(f"*{ext.upper()}"))
        
        if not image_files:
            print(f"No image files found in {input_dir}")
            return
        
        print(f"Found {len(image_files)} images to process")
        print("=" * 50)
        
        # Process each image
        successful = 0
        for image_file in image_files:
            print(f"Processing {image_file.name}...")
            
            # Extract landmarks
            landmarks_data = self.process_image(str(image_file))
            
            if landmarks_data:
                # Save landmarks
                landmark_file = self.save_landmarks(landmarks_data, image_file.stem)
                print(f"  ✓ Saved landmarks to {Path(landmark_file).name}")
                successful += 1
        
        print("=" * 50)
        print(f"Successfully processed {successful}/{len(image_files)} images")
        
        return successful > 0
    
    def __del__(self):
        """Clean up MediaPipe resources."""
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()


def run_complete_pipeline(input_dir: str = "images", output_dir: str = "landmarks"):
    """
    Run the complete pipeline:
    1. Process images to extract landmarks
    2. Run golden ratio analysis
    3. Generate human-friendly interpretations
    """
    print("=" * 60)
    print("FACE ANALYSIS PIPELINE")
    print("=" * 60)
    
    # Step 1: Process images
    print("\nStep 1: Extracting MediaPipe Face Landmarks")
    print("-" * 50)
    processor = FaceImageProcessor(output_dir)
    success = processor.process_directory(input_dir)
    
    if not success:
        print("\nNo images were successfully processed. Exiting.")
        return
    
    # Step 2: Run golden ratio analysis
    print("\nStep 2: Running Golden Ratio Analysis")
    print("-" * 50)
    golden.process_landmarks_directory(output_dir)
    
    # Step 3: Generate human-friendly interpretations
    print("\nStep 3: Generating Human-Friendly Interpretations")
    print("-" * 50)
    golden_final.process_all_golden_files(output_dir)
    
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    
    # Print summary
    landmark_dir = Path(output_dir)
    landmark_files = list(landmark_dir.glob("*.landmark"))
    golden_files = list(landmark_dir.glob("*.golden.json"))
    final_files = list(landmark_dir.glob("*.golden.final.json"))
    
    print(f"\nGenerated files:")
    print(f"  - {len(landmark_files)} landmark files")
    print(f"  - {len(golden_files)} golden ratio analyses")
    print(f"  - {len(final_files)} human-friendly interpretations")
    
    if final_files:
        print(f"\nResults saved in: {output_dir}/")
        print("  - *.landmark: Raw MediaPipe landmarks")
        print("  - *.golden.json: Technical golden ratio metrics")
        print("  - *.golden.final.json: Human-friendly interpretations")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Process face images through MediaPipe and golden ratio analysis"
    )
    parser.add_argument(
        "input_dir",
        nargs="?",
        default="images",
        help="Directory containing input images (default: images)"
    )
    parser.add_argument(
        "--output",
        "-o",
        default="landmarks",
        help="Output directory for results (default: landmarks)"
    )
    parser.add_argument(
        "--single",
        "-s",
        help="Process a single image file"
    )
    
    args = parser.parse_args()
    
    if args.single:
        # Process single image
        print(f"Processing single image: {args.single}")
        processor = FaceImageProcessor(args.output)
        
        landmarks_data = processor.process_image(args.single)
        if landmarks_data:
            image_name = Path(args.single).stem
            landmark_file = processor.save_landmarks(landmarks_data, image_name)
            print(f"✓ Saved landmarks to {landmark_file}")
            
            # Run golden ratio analysis on this file
            print("\nRunning golden ratio analysis...")
            result = golden.process_landmark_file(landmark_file)
            golden_file = landmark_file.replace('.landmark', '.golden.json')
            with open(golden_file, 'w') as f:
                json.dump(result, f, indent=2)
            
            # Generate human-friendly interpretation
            print("Generating human-friendly interpretation...")
            final_result = golden_final.process_golden_file(golden_file)
            final_file = golden_file.replace('.golden.json', '.golden.final.json')
            with open(final_file, 'w') as f:
                json.dump(final_result, f, indent=2)
            
            print(f"\n✓ Analysis complete!")
            print(f"  Results: {final_file}")
    else:
        # Process directory
        run_complete_pipeline(args.input_dir, args.output)


if __name__ == "__main__":
    # Check if MediaPipe is installed
    try:
        import mediapipe
    except ImportError:
        print("Error: MediaPipe is not installed.")
        print("Please install it with: pip install mediapipe")
        sys.exit(1)
    
    main()