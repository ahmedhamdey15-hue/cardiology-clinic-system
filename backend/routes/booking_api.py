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
    
    name = data.get('name', '').strip()
    if not name or len(name.split()) < 3:
        return jsonify({'error': 'يجب إدخال الاسم ثلاثياً على الأقل'}), 400

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

@booking_api_bp.route('/api/booking/available_slots', methods=['GET'])
def get_available_slots():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date is required'}), 400
        
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    from backend.models import Visit
    
    # Working hours: 10:00 to 22:00, every 30 minutes
    # Generate all possible slots
    all_slots = []
    for hour in range(10, 22):
        all_slots.append(f"{hour:02d}:00")
        all_slots.append(f"{hour:02d}:30")
        
    # Find booked slots in Visit table
    visits = Visit.query.filter_by(appointment_date=target_date).all()
    booked_times = [v.appointment_time for v in visits if v.appointment_time]
    
    # Also check approved OnlineBookings just in case
    bookings = OnlineBooking.query.filter_by(desired_date=target_date, status='approved').all()
    booked_times.extend([b.desired_time for b in bookings if b.desired_time])
    
    # Remove booked slots
    available_slots = [slot for slot in all_slots if slot not in booked_times]
    
    # If today, remove past slots
    if target_date == datetime.today().date():
        current_time = datetime.now().strftime("%H:%M")
        available_slots = [slot for slot in available_slots if slot > current_time]
        
    return jsonify(available_slots)

@booking_api_bp.route('/api/booking/<int:booking_id>/status', methods=['PUT'])
@login_required
def update_booking_status(booking_id):
    # Protected endpoint for reception to approve/reject
    data = request.json
    booking = OnlineBooking.query.get(booking_id)
    if not booking:
        return jsonify({'error': 'الطلب غير موجود'}), 404
        
    old_status = booking.status
    new_status = data.get('status', booking.status)
    booking.status = new_status
    
    if 'desired_date' in data:
        try:
            booking.desired_date = datetime.strptime(data['desired_date'], '%Y-%m-%d').date()
        except: pass
    if 'desired_time' in data:
        booking.desired_time = data['desired_time']
        
    from backend.models import Patient, Visit, Measurement
    
    # Auto-create or update Patient and Visit when approved
    if new_status == 'approved':
        # Check if patient exists by phone
        patient = Patient.query.filter_by(phone=booking.phone).first()
        if not patient:
            # Create a stub patient
            patient = Patient(name=booking.name, phone=booking.phone)
            db.session.add(patient)
            db.session.flush() # To get patient.file_number
            
        # Check if visit already exists for this date/patient
        visit = Visit.query.filter_by(patient_file_number=patient.file_number, appointment_date=booking.desired_date).first()
        if not visit:
            new_visit = Visit(
                patient_file_number=patient.file_number,
                visit_type='كشف جديد',
                cost=0,
                appointment_date=booking.desired_date,
                appointment_time=booking.desired_time,
                status='waiting'
            )
            db.session.add(new_visit)
            db.session.flush()
            
            new_measurement = Measurement(visit_id=new_visit.id)
            db.session.add(new_measurement)
        else:
            visit.appointment_time = booking.desired_time

    db.session.commit()
    return jsonify({'message': 'تم تحديث الحجز بنجاح'})
