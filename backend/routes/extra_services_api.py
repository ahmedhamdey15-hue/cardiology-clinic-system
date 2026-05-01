from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import Visit, ExtraService
from backend.extensions import db

extra_services_api_bp = Blueprint('extra_services_api', __name__)

@extra_services_api_bp.route('/api/visits/<int:visit_id>/extra_services', methods=['GET'])
@login_required
def get_extra_services(visit_id):
    services = ExtraService.query.filter_by(visit_id=visit_id).all()
    return jsonify([{
        'id': s.id,
        'service_name': s.service_name,
        'cost': s.cost,
        'billed': s.billed,
        'notes': s.notes
    } for s in services])

@extra_services_api_bp.route('/api/visits/<int:visit_id>/extra_services', methods=['POST'])
@login_required
def add_extra_service(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404
    data = request.json
    svc = ExtraService(
        visit_id=visit_id,
        service_name=data.get('service_name'),
        cost=data.get('cost', 0),
        notes=data.get('notes', '')
    )
    db.session.add(svc)
    db.session.commit()
    return jsonify({'message': 'Service added', 'id': svc.id}), 201

@extra_services_api_bp.route('/api/extra_services/<int:service_id>', methods=['DELETE'])
@login_required
def delete_extra_service(service_id):
    svc = ExtraService.query.get(service_id)
    if not svc:
        return jsonify({'error': 'Service not found'}), 404
    db.session.delete(svc)
    db.session.commit()
    return jsonify({'message': 'Service deleted'})

@extra_services_api_bp.route('/api/extra_services/<int:service_id>/cost', methods=['PUT'])
@login_required
def update_service_cost(service_id):
    """Reception sets the price for an ordered service."""
    svc = ExtraService.query.get(service_id)
    if not svc:
        return jsonify({'error': 'Service not found'}), 404
    data = request.json
    svc.cost = data.get('cost', 0)
    db.session.commit()
    return jsonify({'message': 'Cost updated', 'cost': svc.cost})

@extra_services_api_bp.route('/api/visits/<int:visit_id>/extra_services/bill', methods=['PUT'])
@login_required
def bill_extra_services(visit_id):
    """Mark all extra services for this visit as billed by reception."""
    services = ExtraService.query.filter_by(visit_id=visit_id).all()
    for s in services:
        s.billed = True
    db.session.commit()
    total = sum(s.cost for s in services)
    return jsonify({'message': 'Services billed', 'total': total})
