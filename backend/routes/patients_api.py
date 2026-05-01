from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import Patient
from backend.extensions import db

patients_api_bp = Blueprint('patients_api', __name__)

@patients_api_bp.route('/api/patients', methods=['GET'])
@login_required
def get_patients():
    patients = Patient.query.all()
    result = []
    for p in patients:
        result.append({
            'file_number': p.file_number,
            'name': p.name,
            'phone': p.phone,
            'address': p.address,
            'age': p.age,
            'gender': p.gender
        })
    return jsonify(result)

@patients_api_bp.route('/api/patients/<int:file_number>', methods=['GET'])
@login_required
def get_patient(file_number):
    patient = Patient.query.get(file_number)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
        
    # Get all past visits with medical records
    past_visits = []
    for v in patient.visits:
        m = v.measurements
        past_visits.append({
            'visit_id': v.id,
            'date': v.appointment_date.isoformat() if v.appointment_date else None,
            'type': v.visit_type,
            'doctor_diagnosis': m.doctor_diagnosis if m else None,
            'prescription': m.prescription if m else None,
            'ecg_result': m.ecg_result if m else None,
            'blood_pressure': m.blood_pressure if m else None,
            'blood_sugar': m.blood_sugar if m else None,
            'assistant_notes': m.assistant_notes if m else None
        })

    return jsonify({
        'file_number': patient.file_number,
        'name': patient.name,
        'phone': patient.phone,
        'address': patient.address,
        'age': patient.age,
        'gender': patient.gender,
        'chronic_diseases': patient.chronic_diseases,
        'chronic_medications': patient.chronic_medications,
        'history': past_visits
    })

@patients_api_bp.route('/api/patients', methods=['POST'])
@login_required
def create_patient():
    data = request.json
        
    new_patient = Patient(
        name=data.get('name'),
        phone=data.get('phone'),
        address=data.get('address'),
        age=data.get('age'),
        gender=data.get('gender'),
        chronic_diseases=data.get('chronic_diseases', ''),
        chronic_medications=data.get('chronic_medications', '')
    )
    db.session.add(new_patient)
    db.session.commit()
    return jsonify({'message': 'Patient created successfully', 'file_number': new_patient.file_number}), 201

import os
from werkzeug.utils import secure_filename
from flask import send_from_directory
from backend.models import PatientAttachment

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@patients_api_bp.route('/api/patients/<int:file_number>/attachments', methods=['POST'])
@login_required
def upload_attachment(file_number):
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # To avoid collisions, prepend timestamp
        from datetime import datetime
        unique_filename = f"{int(datetime.timestamp(datetime.now()))}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        attachment = PatientAttachment(
            patient_file_number=file_number,
            file_name=filename,
            file_path=unique_filename
        )
        db.session.add(attachment)
        db.session.commit()
        return jsonify({'message': 'File successfully uploaded', 'id': attachment.id}), 201
    return jsonify({'error': 'File type not allowed'}), 400

@patients_api_bp.route('/api/patients/<int:file_number>/attachments', methods=['GET'])
@login_required
def get_attachments(file_number):
    attachments = PatientAttachment.query.filter_by(patient_file_number=file_number).all()
    result = []
    for a in attachments:
        result.append({
            'id': a.id,
            'file_name': a.file_name,
            'upload_date': a.upload_date.isoformat(),
            'url': f'/api/attachments/{a.id}'
        })
    return jsonify(result)

@patients_api_bp.route('/api/attachments/<int:attachment_id>', methods=['GET'])
@login_required
def download_attachment(attachment_id):
    attachment = PatientAttachment.query.get(attachment_id)
    if not attachment:
        return jsonify({'error': 'Attachment not found'}), 404
    return send_from_directory(UPLOAD_FOLDER, attachment.file_path, as_attachment=False)
