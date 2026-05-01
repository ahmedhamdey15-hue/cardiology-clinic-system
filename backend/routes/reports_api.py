from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import Visit
from backend.extensions import db

reports_api_bp = Blueprint('reports_api', __name__)

@reports_api_bp.route('/api/reports/daily', methods=['GET'])
@login_required
def get_daily_report():
    report_date_str = request.args.get('date')
    if report_date_str:
        try:
            report_date = datetime.strptime(report_date_str, '%Y-%m-%d').date()
        except ValueError:
            report_date = date.today()
    else:
        report_date = date.today()

    visits = Visit.query.filter_by(appointment_date=report_date).order_by(Visit.appointment_time).all()

    result = []
    total_cost = 0
    for v in visits:
        m = v.measurements
        entry = {
            'visit_id': v.id,
            'patient_name': v.patient.name,
            'file_number': v.patient.file_number,
            'phone': v.patient.phone,
            'appointment_time': v.appointment_time,
            'visit_type': v.visit_type,
            'cost': v.cost or 0,
            'status': v.status,
            'is_urgent': v.is_urgent,
            'doctor_diagnosis': m.doctor_diagnosis if m else None,
            'prescription': m.prescription if m else None,
            'ecg_result': m.ecg_result if m else None,
        }
        total_cost += (v.cost or 0)
        result.append(entry)

    return jsonify({'date': report_date.isoformat(), 'visits': result, 'total_cost': total_cost})
