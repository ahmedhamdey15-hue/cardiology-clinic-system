from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import Patient, Visit, Measurement
from backend.extensions import db

visits_api_bp = Blueprint('visits_api', __name__)

@visits_api_bp.route('/api/visits', methods=['POST'])
@login_required
def create_visit():
    data = request.json
    patient = Patient.query.get(data.get('patient_file_number'))
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
        
    try:
        app_date = datetime.strptime(data.get('appointment_date'), '%Y-%m-%d').date() if data.get('appointment_date') else date.today()
    except ValueError:
        app_date = date.today()
        
    new_visit = Visit(
        patient_file_number=patient.file_number,
        visit_type=data.get('visit_type'),
        cost=data.get('cost'),
        appointment_date=app_date,
        appointment_time=data.get('appointment_time'),
        status='waiting',
        is_urgent=data.get('is_urgent', False)
    )
    db.session.add(new_visit)
    db.session.commit()
    
    # Initialize empty measurement record
    new_measurement = Measurement(visit_id=new_visit.id)
    db.session.add(new_measurement)
    db.session.commit()
    
    return jsonify({'message': 'Visit created successfully', 'visit_id': new_visit.id}), 201

@visits_api_bp.route('/api/queue/today', methods=['GET'])
@login_required
def get_today_queue():
    today = date.today()
    # Order by appointment_time and arrival_time
    visits = Visit.query.filter_by(appointment_date=today).order_by(Visit.appointment_time, Visit.arrival_time).all()
    
    queue = []
    for v in visits:
        queue.append({
            'visit_id': v.id,
            'patient_name': v.patient.name,
            'file_number': v.patient.file_number,
            'appointment_time': v.appointment_time,
            'status': v.status,
            'visit_type': v.visit_type,
            'is_urgent': v.is_urgent
        })
    return jsonify(queue)

@visits_api_bp.route('/api/visits/active', methods=['GET'])
@login_required
def get_active_visits():
    today = date.today()
    visits = Visit.query.filter(Visit.appointment_date == today, Visit.status != 'completed').order_by(Visit.is_urgent.desc(), Visit.arrival_time).all()
    result = []
    for v in visits:
        result.append({
            'visit_id': v.id,
            'patient_name': v.patient.name,
            'file_number': v.patient.file_number,
            'appointment_time': v.appointment_time,
            'status': v.status,
            'visit_type': v.visit_type,
            'is_urgent': v.is_urgent
        })
    return jsonify(result)

@visits_api_bp.route('/api/visits/<int:visit_id>/status', methods=['PUT'])
@login_required
def update_visit_status(visit_id):
    data = request.json
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404
        
    visit.status = data.get('status')
    db.session.commit()
    return jsonify({'message': 'Status updated'})

@visits_api_bp.route('/api/visits/<int:visit_id>', methods=['GET'])
@login_required
def get_visit(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404
        
    return jsonify({
        'visit_id': visit.id,
        'patient_file_number': visit.patient_file_number,
        'patient_name': visit.patient.name,
        'visit_type': visit.visit_type,
        'appointment_time': visit.appointment_time,
        'status': visit.status,
        'cost': visit.cost,
        'date': visit.appointment_date.isoformat(),
        'is_urgent': visit.is_urgent
    })

@visits_api_bp.route('/api/visits/<int:visit_id>/measurements', methods=['GET'])
@login_required
def get_measurements(visit_id):
    measurement = Measurement.query.filter_by(visit_id=visit_id).first()
    if not measurement:
        return jsonify({'error': 'Measurement not found'}), 404
        
    return jsonify({
        'blood_pressure': measurement.blood_pressure,
        'blood_sugar': measurement.blood_sugar,
        'ecg_result': measurement.ecg_result,
        'other_medications': measurement.other_medications,
        'assistant_notes': measurement.assistant_notes,
        'doctor_diagnosis': measurement.doctor_diagnosis,
        'prescription': measurement.prescription
    })

@visits_api_bp.route('/api/visits/<int:visit_id>/measurements', methods=['PUT'])
@login_required
def update_measurements(visit_id):
    data = request.json
    measurement = Measurement.query.filter_by(visit_id=visit_id).first()
    if not measurement:
        return jsonify({'error': 'Measurement not found'}), 404
        
    if 'blood_pressure' in data:
        measurement.blood_pressure = data['blood_pressure']
    if 'blood_sugar' in data:
        measurement.blood_sugar = data['blood_sugar']
    if 'ecg_result' in data:
        measurement.ecg_result = data['ecg_result']
    if 'other_medications' in data:
        measurement.other_medications = data['other_medications']
    if 'assistant_notes' in data:
        measurement.assistant_notes = data['assistant_notes']
    if 'doctor_diagnosis' in data:
        measurement.doctor_diagnosis = data['doctor_diagnosis']
    if 'prescription' in data:
        measurement.prescription = data['prescription']
        
    db.session.commit()
    
    # Also optionally update patient's chronic info
    if 'chronic_diseases' in data or 'chronic_medications' in data:
        visit = Visit.query.get(visit_id)
        if visit and visit.patient:
            if 'chronic_diseases' in data:
                visit.patient.chronic_diseases = data['chronic_diseases']
            if 'chronic_medications' in data:
                visit.patient.chronic_medications = data['chronic_medications']
            db.session.commit()

    return jsonify({'message': 'Measurements updated'})

@visits_api_bp.route('/api/visits/weekly', methods=['GET'])
@login_required
def get_weekly_visits():
    today = date.today()
    end_date = today + timedelta(days=6)
    visits = Visit.query.filter(
        Visit.appointment_date >= today,
        Visit.appointment_date <= end_date
    ).order_by(Visit.appointment_date, Visit.appointment_time).all()

    result = []
    for v in visits:
        result.append({
            'visit_id': v.id,
            'patient_name': v.patient.name,
            'file_number': v.patient.file_number,
            'phone': v.patient.phone,
            'appointment_date': v.appointment_date.isoformat(),
            'appointment_time': v.appointment_time,
            'visit_type': v.visit_type,
            'cost': v.cost,
            'status': v.status,
            'is_urgent': v.is_urgent
        })
    return jsonify(result)

@visits_api_bp.route('/api/visits/<int:visit_id>', methods=['PUT'])
@login_required
def update_visit(visit_id):
    data = request.json
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    if 'appointment_date' in data:
        try:
            visit.appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        except ValueError:
            pass
    if 'appointment_time' in data:
        visit.appointment_time = data['appointment_time']
    if 'visit_type' in data:
        visit.visit_type = data['visit_type']
    if 'cost' in data:
        visit.cost = data['cost']
    if 'status' in data:
        visit.status = data['status']
    if 'is_urgent' in data:
        visit.is_urgent = data['is_urgent']

    db.session.commit()
    return jsonify({'message': 'Visit updated successfully'})

@visits_api_bp.route('/api/visits/<int:visit_id>', methods=['DELETE'])
@login_required
def delete_visit(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    # Delete associated measurements first
    Measurement.query.filter_by(visit_id=visit_id).delete()
    db.session.delete(visit)
    db.session.commit()
    return jsonify({'message': 'Visit cancelled successfully'})
