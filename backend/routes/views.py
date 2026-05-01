from flask import Blueprint, render_template, redirect
from flask_login import login_required, current_user
from backend.routes.auth import _role_url, _redirect_by_role

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
@login_required
def index():
    return _redirect_by_role(current_user.role)

@views_bp.route('/booking')
def booking():
    return render_template('booking.html')

@views_bp.route('/admin')
@login_required
def admin_panel():
    if current_user.role not in ['admin', 'doctor']:
        return redirect(_role_url(current_user.role))
    return render_template('admin.html')

@views_bp.route('/reception')
@login_required
def reception():
    if current_user.role not in ['admin', 'receptionist']:
        return redirect(_role_url(current_user.role))
    return render_template('reception.html')

@views_bp.route('/assistant')
@login_required
def assistant():
    if current_user.role not in ['admin', 'assistant']:
        return redirect(_role_url(current_user.role))
    return render_template('assistant.html')

@views_bp.route('/doctor')
@login_required
def doctor():
    if current_user.role not in ['admin', 'doctor']:
        return redirect(_role_url(current_user.role))
    return render_template('doctor.html')
