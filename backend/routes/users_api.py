from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from backend.models import User
from backend.extensions import db, bcrypt
from backend.utils import admin_required

users_api_bp = Blueprint('users_api', __name__)

@users_api_bp.route('/api/users', methods=['GET'])
@login_required
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'name': u.name,
        'role': u.role,
        'theme_color': u.theme_color,
        'theme_bg': u.theme_bg
    } for u in users])

@users_api_bp.route('/api/users', methods=['POST'])
@login_required
@admin_required
def create_user():
    data = request.json
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'error': 'اسم المستخدم موجود مسبقاً'}), 400
    hashed = bcrypt.generate_password_hash(data.get('password', 'clinic123')).decode('utf-8')
    user = User(
        username=data.get('username'),
        password_hash=hashed,
        role=data.get('role', 'receptionist'),
        name=data.get('name', ''),
        theme_color=data.get('theme_color', '#1e40af'),
        theme_bg=data.get('theme_bg', '#f8fafc')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'تم إنشاء المستخدم بنجاح', 'id': user.id}), 201

@users_api_bp.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'المستخدم غير موجود'}), 404
    data = request.json
    if 'name' in data:
        user.name = data['name']
    if 'role' in data:
        user.role = data['role']
    if 'username' in data:
        existing = User.query.filter_by(username=data['username']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'اسم المستخدم مستخدم من قبل شخص آخر'}), 400
        user.username = data['username']
    if 'password' in data and data['password']:
        user.password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    if 'theme_color' in data:
        user.theme_color = data['theme_color']
    if 'theme_bg' in data:
        user.theme_bg = data['theme_bg']
    db.session.commit()
    return jsonify({'message': 'تم تحديث بيانات المستخدم'})

@users_api_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    if user_id == current_user.id:
        return jsonify({'error': 'لا يمكن حذف حسابك الخاص'}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'المستخدم غير موجود'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'تم حذف المستخدم'})
