from datetime import datetime, date
from flask_login import UserMixin
from .extensions import db, login_manager

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False) # admin, doctor, assistant, receptionist
    name = db.Column(db.String(100), nullable=False)
    
    theme_color = db.Column(db.String(20), default='#1e40af')
    theme_bg = db.Column(db.String(20), default='#f8fafc')
    
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class Patient(db.Model):
    __tablename__ = 'patients'
    
    file_number = db.Column(db.Integer, primary_key=True, autoincrement=True) # رقم الملف التلقائي
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    chronic_diseases = db.Column(db.Text)
    chronic_medications = db.Column(db.Text)
    
    visits = db.relationship('Visit', backref='patient', lazy=True, order_by="desc(Visit.appointment_date)")
    attachments = db.relationship('PatientAttachment', backref='patient', lazy=True, order_by="desc(PatientAttachment.upload_date)")

class Visit(db.Model):
    __tablename__ = 'visits'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_file_number = db.Column(db.Integer, db.ForeignKey('patients.file_number'), nullable=False)
    visit_type = db.Column(db.String(50)) # كشف / إعادة
    cost = db.Column(db.Float)
    appointment_date = db.Column(db.Date, default=date.today)
    appointment_time = db.Column(db.String(20)) # e.g. "10:30"
    arrival_time = db.Column(db.DateTime, default=datetime.utcnow) # لتحديد الدور الفعلي
    status = db.Column(db.String(50), default='waiting') # waiting, with_assistant, with_doctor, completed
    is_urgent = db.Column(db.Boolean, default=False)
    
    measurements = db.relationship('Measurement', backref='visit', uselist=False, lazy=True)
    extra_services = db.relationship('ExtraService', backref='visit', lazy=True)

class Measurement(db.Model):
    __tablename__ = 'measurements'
    
    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visits.id'), nullable=False)
    blood_pressure = db.Column(db.String(20))
    blood_sugar = db.Column(db.String(20))
    ecg_result = db.Column(db.Text)
    other_medications = db.Column(db.Text)
    assistant_notes = db.Column(db.Text)
    doctor_diagnosis = db.Column(db.Text)
    prescription = db.Column(db.Text)

class ExtraService(db.Model):
    __tablename__ = 'extra_services'

    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visits.id'), nullable=False)
    service_name = db.Column(db.String(100), nullable=False)
    cost = db.Column(db.Float, default=0)
    billed = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)

class Medicine(db.Model):
    __tablename__ = 'medicines'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)       # اسم الدواء
    dosage_form = db.Column(db.String(80))                              # قرص / شراب / حقنة
    strength = db.Column(db.String(50))                                  # 10mg / 25mg
    instructions = db.Column(db.String(200))                             # تعليمات افتراضية
    notes = db.Column(db.Text)

class Settings(db.Model):
    __tablename__ = 'settings'
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text)

class PatientAttachment(db.Model):
    __tablename__ = 'patient_attachments'
    id = db.Column(db.Integer, primary_key=True)
    patient_file_number = db.Column(db.Integer, db.ForeignKey('patients.file_number'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)

class OnlineBooking(db.Model):
    __tablename__ = 'online_bookings'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    desired_date = db.Column(db.Date, nullable=False)
    desired_time = db.Column(db.String(20))
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending') # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
