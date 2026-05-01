from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import Settings
from backend.extensions import db
from backend.utils import admin_required

settings_api_bp = Blueprint('settings_api', __name__)

@settings_api_bp.route('/api/settings', methods=['GET'])
@login_required
@admin_required
def get_settings():
    settings = Settings.query.all()
    return jsonify({s.key: s.value for s in settings})

@settings_api_bp.route('/api/settings', methods=['POST'])
@login_required
@admin_required
def update_settings():
    data = request.json
    for key, value in data.items():
        setting = Settings.query.filter_by(key=key).first()
        if setting:
            setting.value = value
        else:
            new_setting = Settings(key=key, value=value)
            db.session.add(new_setting)
    db.session.commit()
    return jsonify({'message': 'تم حفظ الإعدادات بنجاح'})
