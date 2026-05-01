from flask import Blueprint, request, jsonify, redirect, url_for, render_template
from flask_login import login_user, login_required, logout_user, current_user
from backend.models import User
from backend.extensions import bcrypt, db

auth_bp = Blueprint('auth', __name__)

def _role_url(role):
    mapping = {
        'admin': '/admin',
        'doctor': '/doctor',
        'receptionist': '/reception',
        'assistant': '/assistant',
    }
    return mapping.get(role, '/')

def _redirect_by_role(role):
    return redirect(_role_url(role))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return _redirect_by_role(current_user.role)
        
    if request.method == 'POST':
        data = request.json
        user = User.query.filter_by(username=data.get('username')).first()
        if user and bcrypt.check_password_hash(user.password_hash, data.get('password')):
            login_user(user)
            return jsonify({
                'message': 'تم تسجيل الدخول بنجاح',
                'role': user.role,
                'redirect': _role_url(user.role)
            })
        else:
            return jsonify({'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401
    
    next_page = request.args.get('next', '')
    return render_template('login.html', next_page=next_page)

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@auth_bp.route('/api/current_user', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        'username': current_user.username, 
        'role': current_user.role, 
        'name': current_user.name, 
        'theme_color': current_user.theme_color, 
        'theme_bg': current_user.theme_bg
    })

@auth_bp.route('/api/user/theme', methods=['PUT', 'POST'])
@login_required
def update_user_theme():
    data = request.json
    if 'theme_color' in data:
        current_user.theme_color = data['theme_color']
    if 'theme_bg' in data:
        current_user.theme_bg = data['theme_bg']
    db.session.commit()
    return jsonify({'message': 'تم حفظ الألوان بنجاح'})
