import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import numpy as np
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import os
import json
from pathlib import Path

def draw_landmarks_on_image(rgb_image, detection_result):
    face_landmarks_list = detection_result.face_landmarks
    annotated_image = cv2.cvtColor(np.copy(rgb_image), cv2.COLOR_RGB2BGR)

    for idx in range(len(face_landmarks_list)):
        face_landmarks = face_landmarks_list[idx]

        face_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
        face_landmarks_proto.landmark.extend([
            landmark_pb2.NormalizedLandmark(x=landmark.x, y=landmark.y, z=landmark.z) for landmark in face_landmarks
        ])

        solutions.drawing_utils.draw_landmarks(
            image=annotated_image,
            landmark_list=face_landmarks_proto,
            connections=mp.solutions.face_mesh.FACEMESH_TESSELATION,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp.solutions.drawing_styles
            .get_default_face_mesh_tesselation_style())
        solutions.drawing_utils.draw_landmarks(
            image=annotated_image,
            landmark_list=face_landmarks_proto,
            connections=mp.solutions.face_mesh.FACEMESH_CONTOURS,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp.solutions.drawing_styles
            .get_default_face_mesh_contours_style())
        solutions.drawing_utils.draw_landmarks(
            image=annotated_image,
            landmark_list=face_landmarks_proto,
            connections=mp.solutions.face_mesh.FACEMESH_IRISES,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp.solutions.drawing_styles
            .get_default_face_mesh_iris_connections_style())

    return annotated_image

def save_landmarks_data(detection_result, filepath):
    landmarks_data = {
        "face_landmarks": [],
        "face_blendshapes": [],
        "facial_transformation_matrixes": []
    }
    
    for face_landmarks in detection_result.face_landmarks:
        face_data = []
        for landmark in face_landmarks:
            face_data.append({
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility if hasattr(landmark, 'visibility') else None,
                "presence": landmark.presence if hasattr(landmark, 'presence') else None
            })
        landmarks_data["face_landmarks"].append(face_data)
    
    if detection_result.face_blendshapes:
        for blendshapes in detection_result.face_blendshapes:
            blendshapes_data = []
            for blendshape in blendshapes:
                blendshapes_data.append({
                    "index": blendshape.index,
                    "score": blendshape.score,
                    "category_name": blendshape.category_name if hasattr(blendshape, 'category_name') else None
                })
            landmarks_data["face_blendshapes"].append(blendshapes_data)
    
    if detection_result.facial_transformation_matrixes:
        for matrix in detection_result.facial_transformation_matrixes:
            landmarks_data["facial_transformation_matrixes"].append(matrix.tolist() if hasattr(matrix, 'tolist') else str(matrix))
    
    with open(filepath, 'w') as f:
        json.dump(landmarks_data, f, indent=2)

def process_images():
    os.makedirs('input', exist_ok=True)
    os.makedirs('output', exist_ok=True)
    os.makedirs('landmarks', exist_ok=True)
    
    base_options = python.BaseOptions(model_asset_path='face_landmarker_v2_with_blendshapes.task')
    options = vision.FaceLandmarkerOptions(base_options=base_options,
                                           output_face_blendshapes=True,
                                           output_facial_transformation_matrixes=True,
                                           num_faces=1)
    detector = vision.FaceLandmarker.create_from_options(options)
    
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp')
    
    input_dir = Path('input')
    output_dir = Path('output')
    landmarks_dir = Path('landmarks')
    
    image_files = [f for f in input_dir.iterdir() if f.suffix.lower() in supported_formats]
    
    if not image_files:
        print("No image files found in input directory")
        return
    
    print(f"Found {len(image_files)} image(s) to process")
    
    for image_path in image_files:
        print(f"Processing: {image_path.name}")
        
        try:
            image = mp.Image.create_from_file(str(image_path))
            
            detection_result = detector.detect(image)
            
            if detection_result.face_landmarks:
                annotated_image = draw_landmarks_on_image(image.numpy_view(), detection_result)
                
                output_path = output_dir / image_path.name
                cv2.imwrite(str(output_path), annotated_image)
                print(f"  Saved annotated image: {output_path}")
                
                landmarks_filename = f"{image_path.name}.landmark"
                landmarks_path = landmarks_dir / landmarks_filename
                save_landmarks_data(detection_result, str(landmarks_path))
                print(f"  Saved landmarks data: {landmarks_path}")
            else:
                print(f"  No faces detected in {image_path.name}")
                
        except Exception as e:
            print(f"  Error processing {image_path.name}: {str(e)}")
    
    print("Processing complete!")

if __name__ == "__main__":
    process_images()