from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_login import login_required
from backend.models import OnlineBooking
from backend.extensions import db

booking_api_bp = Blueprint('booking_api', __name__)

@booking_api_bp.route('/api/booking', methods=['POST'])
def create_booking():
    # Public endpoint for patients to request a booking
    data = request.json
    try:
        desired_date = datetime.strptime(data.get('desired_date'), '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({'error': 'تاريخ غير صالح'}), 400

    phone = data.get('phone', '')
    if not phone or not phone.startswith('0') or len(phone) != 11 or not phone.isdigit():
        return jsonify({'error': 'رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بصفر (0)'}), 400

    new_booking = OnlineBooking(
        name=data.get('name'),
        phone=data.get('phone'),
        desired_date=desired_date,
        desired_time=data.get('desired_time', ''),
        reason=data.get('reason', '')
    )
    db.session.add(new_booking)
    db.session.commit()
    return jsonify({'message': 'تم إرسال طلب الحجز بنجاح، سيتم التواصل معك قريباً'}), 201

@booking_api_bp.route('/api/booking', methods=['GET'])
@login_required
def get_bookings():
    # Protected endpoint for reception to view requests
    status_filter = request.args.get('status', 'pending')
    bookings = OnlineBooking.query.filter_by(status=status_filter).order_by(OnlineBooking.created_at.desc()).all()
    
    result = []
    for b in bookings:
        result.append({
            'id': b.id,
            'name': b.name,
            'phone': b.phone,
            'desired_date': b.desired_date.isoformat() if b.desired_date else None,
            'desired_time': b.desired_time,
            'reason': b.reason,
            'status': b.status,
            'created_at': b.created_at.isoformat() if b.created_at else None
        })
    return jsonify(result)

@booking_api_bp.route('/api/booking/<int:booking_id>/status', methods=['PUT'])
@login_required
def update_booking_status(booking_id):
    # Protected endpoint for reception to approve/reject
    data = request.json
    booking = OnlineBooking.query.get(booking_id)
    if not booking:
        return jsonify({'error': 'الطلب غير موجود'}), 404
        
    booking.status = data.get('status', booking.status)
    db.session.commit()
    return jsonify({'message': 'تم تحديث حالة الطلب'})
