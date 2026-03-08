import os
import math
import gradio as gr
import cadquery as cq
import trimesh
import numpy as np

os.environ["CQ_SHOW_MESHES"] = "0"

def find_top_bottom_faces(part):
    top_faces = part.faces(">Z").vals()
    bottom_faces = part.faces("<Z").vals()
    return top_faces, bottom_faces

def dfm_analysis(file, surface_choice, material="ABS", quantity=1000):
    if not file:
        return "Upload STEP file first"
    
    part = cq.importers.importStep(file.name)
    top_faces, bottom_faces = find_top_bottom_faces(part)
    
    if surface_choice == "Top surface":
        pull_dir = np.array([0, 0, -1.0])
        ref_faces = top_faces
    else:
        pull_dir = np.array([0, 0, 1.0])
        ref_faces = bottom_faces
    
    # Draft check
    faces = part.faces().vals()
    draft_deg = 2.0
    draft_rad = math.radians(draft_deg)
    bad_faces = []
    for i, face in enumerate(faces):
        normal = np.array(face.Normal().toTuple())
        normal /= np.linalg.norm(normal) + 1e-9
        cos_theta = np.dot(normal, pull_dir)
        if cos_theta < math.cos(draft_rad):
            bad_faces.append(i)
    
    # Volume/cost
    bbox = part.val().BoundingBox()
    vol_cm3 = bbox.xlen * bbox.ylen * bbox.zlen / 1000
    densities = {"ABS": 1.05, "PP": 0.9, "PC": 1.2}
    rates = {"ABS": 200, "PP": 180, "PC": 260}
    density = densities.get(material, 1.05)
    rate = rates.get(material
