from functools import wraps
from flask import jsonify
from flask_login import current_user

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role not in ['admin', 'doctor']:
            return jsonify({'error': 'غير مصرح لك'}), 403
        return f(*args, **kwargs)
    return decorated
