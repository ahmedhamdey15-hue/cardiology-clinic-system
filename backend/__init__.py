import os
import time
from flask import Flask
from sqlalchemy.exc import OperationalError
from backend.extensions import db, bcrypt, login_manager, cors
from backend.models import User, Medicine

def create_app(config_name='default'):
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    app.config['SECRET_KEY'] = 'super-secret-clinic-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///clinic.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    cors.init_app(app)
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)

    # Register blueprints
    from backend.routes.auth import auth_bp
    from backend.routes.views import views_bp
    from backend.routes.users_api import users_api_bp
    from backend.routes.medicines_api import medicines_api_bp
    from backend.routes.patients_api import patients_api_bp
    from backend.routes.visits_api import visits_api_bp
    from backend.routes.extra_services_api import extra_services_api_bp
    from backend.routes.reports_api import reports_api_bp
    from backend.routes.settings_api import settings_api_bp
    from backend.routes.booking_api import booking_api_bp
    from backend.routes.analytics_api import analytics_api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(views_bp)
    app.register_blueprint(users_api_bp)
    app.register_blueprint(medicines_api_bp)
    app.register_blueprint(patients_api_bp)
    app.register_blueprint(visits_api_bp)
    app.register_blueprint(extra_services_api_bp)
    app.register_blueprint(reports_api_bp)
    app.register_blueprint(settings_api_bp)
    app.register_blueprint(booking_api_bp)
    app.register_blueprint(analytics_api_bp)

    # Database initialization and seeding
    with app.app_context():
        retries = 5
        while retries > 0:
            try:
                db.create_all()
                # Create default admin if not exists
                if not User.query.filter_by(username='admin').first():
                    hashed_password = bcrypt.generate_password_hash('admin123').decode('utf-8')
                    admin = User(username='admin', password_hash=hashed_password, role='admin', name='مدير النظام')
                    db.session.add(admin)
                    db.session.commit()
                # Seed common cardiology medicines
                if Medicine.query.count() == 0:
                    seed_medicines = [
                        ('أسبرين', 'قرص', '75mg',  'مرة يومياً بعد الأكل'),
                        ('كلوبيدوجريل - Plavix', 'قرص', '75mg', 'مرة يومياً'),
                        ('أتورفاستاتين - Lipitor', 'قرص', '20mg / 40mg / 80mg', 'مرة يومياً ليلاً'),
                        ('روزوفاستاتين - Crestor', 'قرص', '10mg / 20mg', 'مرة يومياً'),
                        ('أملوديبين - Norvasc', 'قرص', '5mg / 10mg', 'مرة يومياً'),
                        ('بيسوبرولول - Concor', 'قرص', '2.5mg / 5mg / 10mg', 'مرة يومياً صباحاً'),
                        ('كارفيديلول - Coreg', 'قرص', '6.25mg / 12.5mg / 25mg', 'مرتين يومياً مع الأكل'),
                        ('ميتوبرولول', 'قرص', '25mg / 50mg / 100mg', 'مرة أو مرتين يومياً'),
                        ('راميبريل', 'قرص', '2.5mg / 5mg / 10mg', 'مرة يومياً'),
                        ('إيناليبريل', 'قرص', '5mg / 10mg / 20mg', 'مرة أو مرتين يومياً'),
                        ('ليزينوبريل', 'قرص', '5mg / 10mg / 20mg', 'مرة يومياً'),
                        ('فالسارتان - Diovan', 'قرص', '80mg / 160mg / 320mg', 'مرة يومياً'),
                        ('لوسارتان - Cozaar', 'قرص', '25mg / 50mg / 100mg', 'مرة يومياً'),
                        ('فوروسيميد - Lasix', 'قرص', '40mg', 'صباحاً على معدة فارغة'),
                        ('سبيرونولاكتون', 'قرص', '25mg / 50mg', 'مرة يومياً مع الأكل'),
                        ('نيتروجليسرين - تحت اللسان', 'قرص تحت اللسان', '0.5mg', 'عند الحاجة لألم الصدر'),
                        ('إيزوسوربيد مونونيترات', 'قرص', '30mg / 60mg', 'مرة يومياً صباحاً'),
                        ('ديجوكسين', 'قرص', '0.25mg', 'مرة يومياً مع مراقبة المستوى'),
                        ('أميودارون', 'قرص', '200mg', 'حسب توجيه الطبيب'),
                        ('وارفارين', 'قرص', '1mg / 2.5mg / 5mg', 'مرة يومياً مع مراقبة INR'),
                        ('ريفاروكسابان - Xarelto', 'قرص', '15mg / 20mg', 'مرة يومياً مع العشاء'),
                        ('أبيكسابان - Eliquis', 'قرص', '2.5mg / 5mg', 'مرتين يومياً'),
                        ('ديجوبيترول - Lantus', 'حقنة', 'حسب الجرعة', 'مرة يومياً ليلاً'),
                        ('ميتفورمين', 'قرص', '500mg / 850mg / 1000mg', 'مع الأكل'),
                        ('أوميبرازول', 'كبسول', '20mg / 40mg', 'قبل الفطور'),
                        ('ألفازوسين', 'قرص', '10mg', 'مرة يومياً'),
                        ('نيفيديبين', 'قرص', '10mg / 20mg', 'مرتين يومياً'),
                        ('ديلتيازيم', 'قرص', '60mg / 120mg', 'مرتين يومياً'),
                        ('هيدروكلوروثيازيد', 'قرص', '12.5mg / 25mg', 'صباحاً'),
                        ('إبراليست - Entresto', 'قرص', '24/26mg / 49/51mg / 97/103mg', 'مرتين يومياً'),
                    ]
                    for name, form, strength, instructions in seed_medicines:
                        db.session.add(Medicine(name=name, dosage_form=form, strength=strength, instructions=instructions))
                    db.session.commit()
                    print("Medicines seeded successfully.")
                print("Database connected and tables created successfully.")
                break
            except OperationalError:
                print(f"Database connection failed. Retrying in 5 seconds... ({retries} retries left)")
                time.sleep(5)
                retries -= 1

    return app
