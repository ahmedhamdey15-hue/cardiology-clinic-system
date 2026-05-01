from datetime import datetime, date, timedelta
from flask import Blueprint, jsonify
from flask_login import login_required
from sqlalchemy import func
from backend.models import Visit, Patient
from backend.extensions import db
from backend.utils import admin_required

analytics_api_bp = Blueprint('analytics_api', __name__)

@analytics_api_bp.route('/api/analytics/dashboard', methods=['GET'])
@login_required
@admin_required
def get_dashboard_analytics():
    # 1. Total income this month
    today = date.today()
    start_of_month = today.replace(day=1)
    monthly_income = db.session.query(func.sum(Visit.cost)).filter(Visit.appointment_date >= start_of_month).scalar() or 0

    # 2. Total patients
    total_patients = Patient.query.count()

    # 3. Visits count over the last 7 days
    last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    visits_trend = []
    for d in last_7_days:
        count = Visit.query.filter_by(appointment_date=d).count()
        visits_trend.append({'date': d.strftime('%Y-%m-%d'), 'count': count})

    return jsonify({
        'monthly_income': monthly_income,
        'total_patients': total_patients,
        'visits_trend': visits_trend
    })
