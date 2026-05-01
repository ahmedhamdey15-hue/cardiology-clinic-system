from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import Medicine
from backend.extensions import db
from backend.utils import admin_required

medicines_api_bp = Blueprint('medicines_api', __name__)

@medicines_api_bp.route('/api/medicines', methods=['GET'])
@login_required
def get_medicines():
    q = request.args.get('q', '')
    query = Medicine.query
    if q:
        query = query.filter(Medicine.name.ilike(f'%{q}%'))
    medicines = query.order_by(Medicine.name).all()
    return jsonify([{
        'id': m.id, 'name': m.name,
        'dosage_form': m.dosage_form,
        'strength': m.strength,
        'instructions': m.instructions,
        'notes': m.notes
    } for m in medicines])

@medicines_api_bp.route('/api/medicines', methods=['POST'])
@login_required
@admin_required
def add_medicine():
    data = request.json
    if Medicine.query.filter_by(name=data.get('name')).first():
        return jsonify({'error': 'الدواء موجود بالفعل'}), 400
    m = Medicine(
        name=data.get('name'),
        dosage_form=data.get('dosage_form',''),
        strength=data.get('strength',''),
        instructions=data.get('instructions',''),
        notes=data.get('notes','')
    )
    db.session.add(m)
    db.session.commit()
    return jsonify({'message': 'تمت إضافة الدواء', 'id': m.id}), 201

@medicines_api_bp.route('/api/medicines/<int:med_id>', methods=['PUT'])
@login_required
@admin_required
def update_medicine(med_id):
    m = Medicine.query.get(med_id)
    if not m:
        return jsonify({'error': 'الدواء غير موجود'}), 404
    data = request.json
    for field in ('name','dosage_form','strength','instructions','notes'):
        if field in data:
            setattr(m, field, data[field])
    db.session.commit()
    return jsonify({'message': 'تم تحديث الدواء'})

@medicines_api_bp.route('/api/medicines/<int:med_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_medicine(med_id):
    m = Medicine.query.get(med_id)
    if not m:
        return jsonify({'error': 'الدواء غير موجود'}), 404
    db.session.delete(m)
    db.session.commit()
    return jsonify({'message': 'تم الحذف'})
