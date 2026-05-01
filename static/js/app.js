// Base API URL
const API_BASE = '/api';

// Utility to show toasts
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ----------------------------------------------------
// Reception App Logic
// ----------------------------------------------------
const receptionApp = {
    init() {
        if (!document.getElementById('panel-new-visit')) return;

        // Navigation
        document.getElementById('nav-new-visit').addEventListener('click', (e) => this.switchTab(e, 'new-visit'));
        document.getElementById('nav-queue').addEventListener('click', (e) => {
            this.switchTab(e, 'queue');
            this.loadQueue();
        });
        document.getElementById('nav-weekly').addEventListener('click', (e) => {
            this.switchTab(e, 'weekly');
            this.loadWeekly();
        });
        document.getElementById('nav-daily-report').addEventListener('click', (e) => {
            this.switchTab(e, 'daily-report');
            document.getElementById('report_date').valueAsDate = new Date();
        });

        // Toggle between existing and new patient
        document.querySelectorAll('input[name="patient_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isNew = e.target.value === 'new';
                document.getElementById('section-existing-patient').classList.toggle('hidden', isNew);
                document.getElementById('section-new-patient').classList.toggle('hidden', !isNew);
                document.getElementById('visit_patient_file').required = !isNew;
            });
        });

        // Search Patient
        document.getElementById('btn-search-patient').addEventListener('click', () => this.searchPatient());

        // Form Submissions
        document.getElementById('form-new-visit').addEventListener('submit', (e) => this.createVisit(e));

        // Set default date
        const dateInput = document.getElementById('visit_date');
        if (dateInput) dateInput.valueAsDate = new Date();
    },

    switchTab(e, tabId) {
        e.preventDefault();
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        e.target.parentElement.classList.add('active');

        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(`panel-${tabId}`).classList.remove('hidden');
    },

    async searchPatient() {
        const query = document.getElementById('visit_patient_file').value;
        if (!query) return showToast('برجاء إدخال رقم الملف أو الاسم أو الموبايل', 'error');

        try {
            const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(query)}`);
            const display = document.getElementById('patient_info_display');
            if (res.ok) {
                const results = await res.json();
                if (results.length === 0) {
                    display.classList.add('hidden');
                    return showToast('المريض غير مسجل. يرجى التأكد من الاسم أو الرقم.', 'error');
                }
                
                if (results.length === 1) {
                    this.selectSearchedPatient(results[0].file_number, results[0].name, results[0].age, results[0].gender, results[0].phone, results[0].address);
                    showToast('تم العثور على المريض');
                } else {
                    let listHtml = '<strong>نتائج البحث:</strong> (اختر مريض)<ul style="list-style:none; padding:0; margin-top:10px;">';
                    results.forEach(p => {
                        const safeName = p.name.replace(/'/g, "\\'");
                        const safeAddress = (p.address || '').replace(/'/g, "\\'");
                        listHtml += `<li style="padding:10px; border:1px solid var(--border-color); margin-bottom:5px; border-radius:6px; cursor:pointer; background:var(--input-bg);"
                                      onclick="receptionApp.selectSearchedPatient(${p.file_number}, '${safeName}', '${p.age}', '${p.gender}', '${p.phone || ''}', '${safeAddress}')">
                                      ${p.name} - ملف: ${p.file_number} - هاتف: ${p.phone || '--'}
                                     </li>`;
                    });
                    listHtml += '</ul>';
                    display.innerHTML = listHtml;
                    display.classList.remove('hidden');
                }
            } else {
                display.classList.add('hidden');
                showToast('خطأ في البحث', 'error');
            }
        } catch (error) {
            showToast('حدث خطأ في الاتصال', 'error');
        }
    },

    selectSearchedPatient(file_number, name, age, gender, phone, address) {
        document.getElementById('visit_patient_file').value = file_number;
        const display = document.getElementById('patient_info_display');
        display.innerHTML = `
            <strong>الاسم:</strong> ${name} <br>
            <strong>السن:</strong> ${age} | <strong>النوع:</strong> ${gender} <br>
            <strong>هاتف:</strong> ${phone || 'غير مسجل'} | <strong>العنوان:</strong> ${address || 'غير مسجل'}
        `;
        display.classList.remove('hidden');
    },

    async createPatient(e) {
        e.preventDefault();
        const phone = document.getElementById('patient_phone').value;
        if (phone && (!phone.startsWith('0') || phone.length !== 11 || isNaN(phone))) {
            return showToast('رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بصفر', 'error');
        }

        const name = document.getElementById('patient_name').value.trim();
        if (!name || name.split(' ').filter(p => p.trim() !== '').length < 3) {
            return showToast('يجب إدخال اسم المريض ثلاثياً على الأقل', 'error');
        }

        const data = {
            name: name,
            phone: phone,
            address: document.getElementById('patient_address').value,
            age: document.getElementById('patient_age').value,
            gender: document.getElementById('patient_gender').value,
        };

        try {
            const res = await fetch(`${API_BASE}/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const resData = await res.json();
                showToast(`تم تسجيل المريض بنجاح. رقم الملف المولد: ${resData.file_number}`);
                document.getElementById('form-new-patient').reset();
            } else {
                const err = await res.json();
                showToast(err.error || 'حدث خطأ أثناء التسجيل', 'error');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالسيرفر', 'error');
        }
    },

    async createVisit(e) {
        e.preventDefault();
        const isNew = document.querySelector('input[name="patient_type"]:checked').value === 'new';
        let patientFileNumber;

        // If new patient, register first
        if (isNew) {
            const name = document.getElementById('patient_name').value.trim();
            const phone = document.getElementById('patient_phone').value;
            if (!name || name.split(' ').filter(p => p.trim() !== '').length < 3) {
                return showToast('يجب إدخال اسم المريض ثلاثياً على الأقل', 'error');
            }
            if (phone && (!phone.startsWith('0') || phone.length !== 11 || isNaN(phone))) {
                return showToast('رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بصفر', 'error');
            }

            try {
                const pRes = await fetch(`${API_BASE}/patients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        phone: phone,
                        address: document.getElementById('patient_address').value,
                        age: document.getElementById('patient_age').value,
                        gender: document.getElementById('patient_gender').value,
                    })
                });
                if (!pRes.ok) return showToast('حدث خطأ أثناء تسجيل المريض', 'error');
                const pData = await pRes.json();
                patientFileNumber = pData.file_number;
                showToast(`✅ تم تسجيل المريض. رقم الملف: ${patientFileNumber}`);
            } catch {
                return showToast('خطأ في الاتصال بالسيرفر', 'error');
            }
        } else {
            patientFileNumber = document.getElementById('visit_patient_file').value;
        }

        const data = {
            patient_file_number: patientFileNumber,
            visit_type: document.getElementById('visit_type').value,
            cost: document.getElementById('visit_cost').value,
            appointment_date: document.getElementById('visit_date').value,
            appointment_time: document.getElementById('visit_time').value
        };

        try {
            const res = await fetch(`${API_BASE}/visits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast('✅ تم تسجيل الحجز بنجاح وإضافته للدور');
                document.getElementById('form-new-visit').reset();
                document.getElementById('patient_info_display').classList.add('hidden');
                // Reset to 'existing' radio
                document.querySelector('input[name="patient_type"][value="existing"]').checked = true;
                document.getElementById('section-existing-patient').classList.remove('hidden');
                document.getElementById('section-new-patient').classList.add('hidden');
                document.getElementById('visit_date').valueAsDate = new Date();
            } else {
                showToast('حدث خطأ. تأكد من رقم الملف', 'error');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالسيرفر', 'error');
        }
    },

    async loadQueue() {
        try {
            const res = await fetch(`${API_BASE}/queue/today`);
            const queue = await res.json();
            const container = document.getElementById('queue-list-container');
            container.innerHTML = '';

            if (queue.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding: 20px;">لا يوجد مرضى في قائمة اليوم</div>';
                return;
            }

            queue.forEach(q => {
                let statusText = '';
                let statusClass = '';
                switch (q.status) {
                    case 'waiting': statusText = 'في الانتظار'; statusClass = 'status-waiting'; break;
                    case 'with_assistant': statusText = 'مع المساعد ⌛'; statusClass = 'status-with-assistant'; break;
                    case 'with_doctor': statusText = 'كشف، الآن'; statusClass = 'status-with-doctor'; break;
                    case 'completed': statusText = 'تم الكشف ✓'; statusClass = 'status-completed'; break;
                }

                const billBtn = q.status === 'completed' ? `
                    <button onclick="receptionApp.billExtraServices(${q.visit_id}, '${q.patient_name}')"
                        style="margin-top:6px; background:#f97316; color:#fff; border:none; border-radius:6px;
                        padding:4px 12px; cursor:pointer; font-size:0.8rem; font-family:inherit;">
                        💰 تحصيل الخدمات الإضافية
                    </button>` : '';

                container.innerHTML += `
                    <li class="queue-item">
                        <div class="queue-info left">
                            <h4>${q.patient_name} <span class="file-pill">ملف: ${q.file_number}</span></h4>
                            <p>نوع: ${q.visit_type} | موعد تقريبي: ${q.appointment_time || 'غير محدد'}</p>
                            ${billBtn}
                        </div>
                        <div>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </li>
                `;
            });
        } catch (error) {
            showToast('لم نتمكن من جلب الدور', 'error');
        }
    },

    async billExtraServices(visitId, patientName) {
        try {
            const sRes = await fetch(`${API_BASE}/visits/${visitId}/extra_services`);
            const services = await sRes.json();
            const unbilled = services.filter(s => !s.billed);
            if (unbilled.length === 0) {
                showToast(`لا توجد خدمات إضافية غير محصَّلة للمريض ${patientName}`, 'error');
                return;
            }

            // Show billing modal with price inputs per service
            let existingModal = document.getElementById('billing-modal');
            if (existingModal) existingModal.remove();

            const rows = unbilled.map(s => `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <span style="flex:2; font-weight:600;">🩻 ${s.service_name}${s.notes ? ' — ' + s.notes : ''}</span>
                    <input type="number" id="svc_cost_${s.id}" placeholder="التكلفة (ج)" min="0" 
                        style="flex:1; padding:7px 10px; border-radius:8px; border:1px solid #e5e7eb; font-family:inherit;">
                </div>`).join('');

            const modal = document.createElement('div');
            modal.id = 'billing-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
                <div style="background:var(--modal-bg);border-radius:16px;padding:30px;width:460px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <h3 style="margin-top:0;color:var(--primary-color);">💰 تحديد أسعار الخدمات - ${patientName}</h3>
                    <p style="color:#6b7280;font-size:0.9rem;">%u062dدد سعر كل خدمة ثم اضغط تأكيد التحصيل</p>
                    ${rows}
                    <div id="billing-total" style="margin:15px 0;font-weight:700;font-size:1.05rem;color:#1e40af;"></div>
                    <div style="display:flex;gap:10px;margin-top:20px;">
                        <button onclick="receptionApp.confirmBilling(${visitId}, [${unbilled.map(s => s.id).join(',')}])"
                            style="flex:1;background:#f97316;color:#fff;border:none;border-radius:8px;padding:11px;cursor:pointer;font-size:1rem;font-family:inherit;font-weight:700;">
                            تأكيد التحصيل ✅</button>
                        <button onclick="document.getElementById('billing-modal').remove()"
                            style="flex:1;background:var(--input-bg);color:var(--text-main);border:1px solid var(--border-color);border-radius:8px;padding:11px;cursor:pointer;font-size:1rem;font-family:inherit;">
                            إلغاء</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            // Live total updater
            unbilled.forEach(s => {
                const inp = document.getElementById(`svc_cost_${s.id}`);
                inp.addEventListener('input', () => {
                    const total = unbilled.reduce((sum, sv) => {
                        const v = parseFloat(document.getElementById(`svc_cost_${sv.id}`)?.value) || 0;
                        return sum + v;
                    }, 0);
                    document.getElementById('billing-total').textContent = `الإجمالي: ${total} جنيه`;
                });
            });
        } catch {
            showToast('خطأ في الاتصال', 'error');
        }
    },

    async confirmBilling(visitId, serviceIds) {
        try {
            // Update each service cost individually, then bill all
            for (const id of serviceIds) {
                const costVal = parseFloat(document.getElementById(`svc_cost_${id}`)?.value) || 0;
                await fetch(`${API_BASE}/extra_services/${id}/cost`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cost: costVal })
                });
            }
            const bRes = await fetch(`${API_BASE}/visits/${visitId}/extra_services/bill`, { method: 'PUT' });
            if (bRes.ok) {
                const data = await bRes.json();
                showToast(`✅ تم تحصيل ${data.total} جنيه بنجاح`);
                document.getElementById('billing-modal').remove();
                this.loadQueue();
            }
        } catch {
            showToast('خطأ في تسجيل التحصيل', 'error');
        }
    },



    // ---- Weekly Schedule ----
    async loadWeekly() {
        const container = document.getElementById('weekly-container');
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">جاري التحميل...</div>';
        try {
            const res = await fetch(`${API_BASE}/visits/weekly`);
            const visits = await res.json();

            if (visits.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">لا توجد حجوزات خلال الأسبوع القادم</div>';
                return;
            }

            // Group by date
            const grouped = {};
            visits.forEach(v => {
                if (!grouped[v.appointment_date]) grouped[v.appointment_date] = [];
                grouped[v.appointment_date].push(v);
            });

            const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            let html = '';
            Object.keys(grouped).sort().forEach(dateStr => {
                const d = new Date(dateStr + 'T00:00:00');
                const dayName = dayNames[d.getDay()];
                html += `
                    <div style="margin-bottom:24px;">
                        <div style="background:var(--primary-color); color:#fff; padding:10px 16px; border-radius:10px 10px 0 0; font-weight:700; font-size:1rem;">
                            📅 ${dayName} — ${dateStr}
                            <span style="float:left; font-size:0.85rem; opacity:0.9;">${grouped[dateStr].length} حجز</span>
                        </div>
                        <table style="width:100%; border-collapse:collapse; background:var(--card-bg); border-radius:0 0 10px 10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.07);">
                            <thead>
                                <tr style="background:var(--table-header-bg); font-size:0.85rem; color:var(--text-main);">
                                    <th style="padding:10px 12px; text-align:right;">الوقت</th>
                                    <th style="padding:10px 12px; text-align:right;">المريض</th>
                                    <th style="padding:10px 12px; text-align:right;">هاتف</th>
                                    <th style="padding:10px 12px; text-align:right;">نوع الكشف</th>
                                    <th style="padding:10px 12px; text-align:right;">التكلفة</th>
                                    <th style="padding:10px 12px; text-align:center;">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>`;
                grouped[dateStr].forEach(v => {
                    const statusColor = v.status === 'completed' ? 'var(--secondary-color)' : v.status === 'waiting' ? 'var(--warning)' : 'var(--text-muted)';
                    html += `
                        <tr style="border-top:1px solid var(--border-color); font-size:0.9rem;">
                            <td style="padding:10px 12px;">${v.appointment_time || '--'}</td>
                            <td style="padding:10px 12px; font-weight:600;">${v.patient_name} <span style="font-size:0.75rem;color:var(--text-muted);">ملف: ${v.file_number}</span></td>
                            <td style="padding:10px 12px;">${v.phone || '--'}</td>
                            <td style="padding:10px 12px;">${v.visit_type}</td>
                            <td style="padding:10px 12px;">${v.cost || 0} ج</td>
                            <td style="padding:10px 12px; text-align:center; display:flex; gap:6px; justify-content:center;">
                                <button onclick="receptionApp.openEditModal(${v.visit_id}, '${v.visit_type}', '${v.appointment_date}', '${v.appointment_time}', ${v.cost || 0})"
                                    style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;">تعديل</button>
                                <button onclick="receptionApp.cancelVisit(${v.visit_id})"
                                    style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;">إلغاء</button>
                            </td>
                        </tr>`;
                });
                html += `</tbody></table></div>`;
            });
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<div style="color:red;padding:20px;">حدث خطأ في تحميل الجدول</div>';
        }
    },

    printWeekly() {
        const content = document.getElementById('weekly-container').innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
            <html dir="rtl"><head><meta charset="UTF-8">
            <title>الجدول الأسبوعي - عيادة القلب</title>
            <style>body{font-family:'Tajawal',Arial,sans-serif;padding:20px;direction:rtl;}
            table{width:100%;border-collapse:collapse;margin-bottom:20px;}
            th,td{border:1px solid #ddd;padding:8px 12px;text-align:right;}
            th{background:#f1f5f9;font-weight:700;}
            h2{color:#1e40af;}button{display:none;}</style>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
            </head><body>
            <h2>📅 الجدول الأسبوعي للحجوزات - عيادة القلب</h2>
            ${content}
            <script>window.onload=()=>window.print();<\/script>
            </body></html>`);
        win.document.close();
    },

    // ---- Daily Report ----
    async loadDailyReport() {
        const date = document.getElementById('report_date').value;
        const container = document.getElementById('daily-report-container');
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">جاري التحميل...</div>';
        try {
            const res = await fetch(`${API_BASE}/reports/daily?date=${date}`);
            const data = await res.json();
            const visits = data.visits;

            if (!visits || visits.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280;">لا توجد حجوزات في هذا اليوم</div>';
                return;
            }

            const statusMap = { waiting: 'في الانتظار', with_assistant: 'مع المساعد', with_doctor: 'مع الطبيب', completed: 'تم الكشف ✓' };
            let rows = '';
            visits.forEach((v, i) => {
                rows += `
                    <tr style="border-top:1px solid #f1f5f9; font-size:0.9rem; ${v.status === 'completed' ? 'background:#f0fdf4' : ''}">
                        <td style="padding:10px 12px;">${i + 1}</td>
                        <td style="padding:10px 12px; font-weight:600;">${v.patient_name}<br><span style="font-size:0.75rem;color:#6b7280;">ملف: ${v.file_number}</span></td>
                        <td style="padding:10px 12px;">${v.phone || '--'}</td>
                        <td style="padding:10px 12px;">${v.appointment_time || '--'}</td>
                        <td style="padding:10px 12px;">${v.visit_type}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#1e40af;">${v.cost} ج</td>
                        <td style="padding:10px 12px;">${statusMap[v.status] || v.status}</td>
                        <td style="padding:10px 12px; font-size:0.8rem; color:#374151;">${v.doctor_diagnosis || '--'}</td>
                    </tr>`;
            });

            container.innerHTML = `
                <div style="background:#1e40af;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0; font-weight:700; font-size:1rem;">
                    📋 تقرير يوم: ${data.date}
                    <span style="float:left;">${visits.length} حجز | الإجمالي: ${data.total_cost} جنيه</span>
                </div>
                <table style="width:100%;border-collapse:collapse;background:var(--card-bg);border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
                    <thead>
                        <tr style="background:var(--table-header-bg);font-size:0.85rem;color:var(--text-main);">
                            <th style="padding:10px 12px;">#</th>
                            <th style="padding:10px 12px; text-align:right;">المريض</th>
                            <th style="padding:10px 12px; text-align:right;">الهاتف</th>
                            <th style="padding:10px 12px; text-align:right;">الوقت</th>
                            <th style="padding:10px 12px; text-align:right;">نوع الكشف</th>
                            <th style="padding:10px 12px; text-align:right;">التكلفة</th>
                            <th style="padding:10px 12px; text-align:right;">الحالة</th>
                            <th style="padding:10px 12px; text-align:right;">التشخيص</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr style="background:var(--table-header-bg); font-weight:700; color:var(--text-main);">
                            <td colspan="5" style="padding:12px; text-align:right;">الإجمالي الكلي</td>
                            <td style="padding:12px; color:#1e40af; font-size:1.1rem;">${data.total_cost} ج</td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>`;
        } catch (e) {
            container.innerHTML = '<div style="color:red;padding:20px;">حدث خطأ في تحميل التقرير</div>';
        }
    },

    printDailyReport() {
        const date = document.getElementById('report_date').value;
        const content = document.getElementById('daily-report-container').innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
            <html dir="rtl"><head><meta charset="UTF-8">
            <title>تقرير اليوم - عيادة القلب</title>
            <style>body{font-family:'Tajawal',Arial,sans-serif;padding:20px;direction:rtl;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #ccc;padding:8px 12px;text-align:right;}
            th{background:#f1f5f9;font-weight:700;}
            tfoot tr{background:#e5e7eb;font-weight:700;}</style>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
            </head><body>
            <h2>📋 تقرير حجوزات يوم ${date} - عيادة القلب</h2>
            ${content}
            <script>window.onload=()=>window.print();<\/script>
            </body></html>`);
        win.document.close();
    },

    // ---- Edit / Cancel Visit ----
    openEditModal(id, type, date, time, cost) {
        document.getElementById('edit_visit_id').value = id;
        document.getElementById('edit_visit_type').value = type;
        document.getElementById('edit_visit_date').value = date;
        document.getElementById('edit_visit_time').value = time;
        document.getElementById('edit_visit_cost').value = cost;
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'flex';
    },

    closeEditModal() {
        document.getElementById('edit-modal').style.display = 'none';
    },

    async saveEditVisit() {
        const id = document.getElementById('edit_visit_id').value;
        const data = {
            visit_type: document.getElementById('edit_visit_type').value,
            appointment_date: document.getElementById('edit_visit_date').value,
            appointment_time: document.getElementById('edit_visit_time').value,
            cost: document.getElementById('edit_visit_cost').value,
        };
        try {
            const res = await fetch(`${API_BASE}/visits/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('✅ تم تعديل الحجز بنجاح');
                this.closeEditModal();
                this.loadWeekly();
            } else {
                showToast('حدث خطأ أثناء التعديل', 'error');
            }
        } catch {
            showToast('خطأ في الاتصال', 'error');
        }
    },

    async cancelVisit(id) {
        if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return;
        try {
            const res = await fetch(`${API_BASE}/visits/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('✅ تم إلغاء الحجز');
                this.loadWeekly();
            } else {
                showToast('حدث خطأ أثناء الإلغاء', 'error');
            }
        } catch {
            showToast('خطأ في الاتصال', 'error');
        }
    }
};


// ----------------------------------------------------
// Assistant App Logic
// ----------------------------------------------------
const assistantApp = {
    currentVisitId: null,

    init() {
        if (!document.getElementById('assistant-queue')) return;
        this.loadQueue();
        document.getElementById('form-measurements').addEventListener('submit', (e) => this.saveMeasurements(e));
    },

    async loadQueue() {
        try {
            const res = await fetch(`${API_BASE}/queue/today`);
            const queue = await res.json();
            const container = document.getElementById('assistant-queue');
            container.innerHTML = '';

            // Only show waiting or with_assistant
            const relevantQueue = queue.filter(q => q.status === 'waiting' || q.status === 'with_assistant');

            if (relevantQueue.length === 0) {
                container.innerHTML = '<div style="padding:15px; text-align:center; color:#6b7280;">لا يوجد مرضى بانتظار المساعد</div>';
                return;
            }

            relevantQueue.forEach(q => {
                const li = document.createElement('li');
                li.className = `queue-item ${q.visit_id === this.currentVisitId ? 'active' : ''}`;
                li.innerHTML = `
                    <div class="queue-info left" style="width:100%">
                        <h4 style="font-size:1rem; margin-bottom: 2px;">${q.patient_name}</h4>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-size:0.8rem; color:#6b7280;">ملف: ${q.file_number}</span>
                            <span style="font-size:0.8rem; color:${q.status === 'waiting' ? '#d97706' : '#16a34a'}">${q.status === 'waiting' ? 'ينتظر الدخول' : 'يتم فحصه'}</span>
                        </div>
                    </div>
                `;
                li.onclick = () => this.selectPatient(q.visit_id, q.patient_name, q.file_number, q.status);
                container.appendChild(li);
            });
        } catch (error) {
            showToast('خطأ في تحميل القائمة', 'error');
        }
    },

    async selectPatient(visitId, name, fileNumber, status) {
        this.currentVisitId = visitId;
        this.loadQueue(); // Refresh to highlight active

        document.getElementById('no-patient-selected').classList.add('hidden');
        document.getElementById('assistant-panel').classList.remove('hidden');

        document.getElementById('current_patient_name').textContent = name;
        document.getElementById('current_file_number').textContent = fileNumber;
        document.getElementById('current_visit_id').value = visitId;

        if (status === 'waiting') {
            await fetch(`${API_BASE}/visits/${visitId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'with_assistant' })
            });
            this.loadQueue();
        }

        // Load existing patient info
        try {
            const res = await fetch(`${API_BASE}/patients/${fileNumber}`);
            if (res.ok) {
                const data = await res.json();
                document.getElementById('p_chronic_diseases').value = data.chronic_diseases || '';
                document.getElementById('p_chronic_medications').value = data.chronic_medications || '';
            }
        } catch (e) { }

        // Load existing measurements if any for this visit
        try {
            const mRes = await fetch(`${API_BASE}/visits/${visitId}/measurements`);
            if (mRes.ok) {
                const mData = await mRes.json();
                document.getElementById('m_blood_pressure').value = mData.blood_pressure || '';
                document.getElementById('m_blood_sugar').value = mData.blood_sugar || '';
                document.getElementById('m_ecg_result').value = mData.ecg_result || '';
                document.getElementById('m_other_medications').value = mData.other_medications || '';
                document.getElementById('m_assistant_notes').value = mData.assistant_notes || '';
            }
        } catch (e) { }
    },

    async saveMeasurements(e) {
        if (e) e.preventDefault();
        if (!this.currentVisitId) return;

        const data = {
            blood_pressure: document.getElementById('m_blood_pressure').value,
            blood_sugar: document.getElementById('m_blood_sugar').value,
            ecg_result: document.getElementById('m_ecg_result').value,
            other_medications: document.getElementById('m_other_medications').value,
            assistant_notes: document.getElementById('m_assistant_notes').value,
            chronic_diseases: document.getElementById('p_chronic_diseases').value,
            chronic_medications: document.getElementById('p_chronic_medications').value
        };

        try {
            const res = await fetch(`${API_BASE}/visits/${this.currentVisitId}/measurements`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                if (e) showToast('تم حفظ القياسات بنجاح');
            }
        } catch (error) {
            if (e) showToast('خطأ في الحفظ', 'error');
        }
    },

    async transferToDoctor() {
        if (!this.currentVisitId) return;
        await this.saveMeasurements(); // save first just in case

        try {
            const res = await fetch(`${API_BASE}/visits/${this.currentVisitId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'with_doctor' })
            });
            if (res.ok) {
                showToast('تم إرسال الملف للطبيب بنجاح');
                document.getElementById('assistant-panel').classList.add('hidden');
                document.getElementById('no-patient-selected').classList.remove('hidden');
                this.currentVisitId = null;
                this.loadQueue();
            }
        } catch (error) {
            showToast('خطأ في التحويل', 'error');
        }
    }
};

// ----------------------------------------------------
// Doctor App Logic
// ----------------------------------------------------
const doctorApp = {
    currentVisitId: null,

    init() {
        if (!document.getElementById('doctor-ready-queue')) return;
        this.loadQueue();
        document.getElementById('form-doctor-visit').addEventListener('submit', (e) => this.saveDiagnosis(e));
    },

    async loadQueue() {
        try {
            const res = await fetch(`${API_BASE}/queue/today`);
            const queue = await res.json();

            const readyContainer = document.getElementById('doctor-ready-queue');
            const waitingContainer = document.getElementById('doctor-waiting-queue');
            readyContainer.innerHTML = '';
            waitingContainer.innerHTML = '';

            queue.forEach(q => {
                const li = document.createElement('li');
                li.className = `queue-item ${q.visit_id === this.currentVisitId ? 'active' : ''}`;
                li.innerHTML = `
                    <div class="queue-info left" style="width:100%">
                        <h4 style="font-size:1rem; margin-bottom: 2px;">${q.patient_name}</h4>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-size:0.8rem; color:#6b7280;">ملف: ${q.file_number}</span>
                            <span style="font-size:0.8rem; font-weight:bold; color:var(--primary-color);">${q.visit_type}</span>
                        </div>
                    </div>
                `;
                li.onclick = () => this.selectPatient(q.visit_id, q.patient_name, q.file_number);

                if (q.status === 'with_doctor') {
                    li.style.borderLeft = '5px solid var(--danger)';
                    li.style.background = 'var(--input-bg)';
                    readyContainer.appendChild(li);
                } else if (q.status === 'waiting' || q.status === 'with_assistant') {
                    li.style.borderLeft = '3px solid var(--border-color)';
                    waitingContainer.appendChild(li);
                }
            });
        } catch (error) {
            showToast('خطأ في تحميل القائمة', 'error');
        }
    },

    async selectPatient(visitId, name, fileNumber) {
        this.currentVisitId = visitId;
        this.loadQueue(); // highlight

        document.getElementById('d-no-patient-selected').classList.add('hidden');
        document.getElementById('doctor-panel').classList.remove('hidden');

        document.getElementById('d_patient_name').textContent = name;
        document.getElementById('d_file_number').textContent = fileNumber;
        document.getElementById('d_current_visit_id').value = visitId;

        // Fetch Patient details & history
        try {
            const pRes = await fetch(`${API_BASE}/patients/${fileNumber}`);
            if (pRes.ok) {
                const pData = await pRes.json();
                document.getElementById('d_age').textContent = pData.age || '--';
                document.getElementById('d_chronic_diseases').textContent = pData.chronic_diseases || 'لا يوجد';
                document.getElementById('d_chronic_medications').textContent = pData.chronic_medications || 'لا يوجد';

                // History
                const histContainer = document.getElementById('d_history_container');
                histContainer.innerHTML = '';
                if (pData.history && pData.history.length > 0) {
                    let hasHistory = false;
                    pData.history.forEach(h => {
                        // Skip current visit
                        if (h.visit_id === visitId) return;
                        hasHistory = true;

                        histContainer.innerHTML += `
                            <div class="history-item">
                                <div class="history-date">
                                    <span>${h.date || 'تاريخ غير محدد'}</span>
                                    <span class="file-pill">${h.type || 'زيارة'}</span>
                                </div>
                                <div class="history-grid-info">
                                    <div class="history-full-row"><strong>التشخيص النهائي:</strong> ${h.doctor_diagnosis || '--'}</div>
                                    <div class="history-full-row"><strong>الروشتة:</strong> ${h.prescription || '--'}</div>
                                    <div><strong>الضغط:</strong> ${h.blood_pressure || '--'}</div>
                                    <div><strong>السكر:</strong> ${h.blood_sugar || '--'}</div>
                                    <div class="history-full-row"><strong>ملاحظات ورسم قلب:</strong> ${h.ecg_result || '--'}</div>
                                </div>
                            </div>
                        `;
                    });
                    if (!hasHistory) {
                        histContainer.innerHTML = '<p style="color:var(--text-muted); padding:15px; background:var(--item-bg); border-radius:8px;">لا يوجد زيارات سابقة (هذه أول زيارة للمريض)</p>';
                    }
                } else {
                    histContainer.innerHTML = '<p style="color:var(--text-muted); padding:15px; background:var(--item-bg); border-radius:8px;">لا يوجد سجل زيارات للمريض</p>';
                }
            }
        } catch (e) { }

        // Fetch current measurements for this visit
        try {
            const mRes = await fetch(`${API_BASE}/visits/${visitId}/measurements`);
            if (mRes.ok) {
                const mData = await mRes.json();
                document.getElementById('d_blood_pressure').textContent = mData.blood_pressure || '--';
                document.getElementById('d_blood_sugar').textContent = mData.blood_sugar || '--';
                document.getElementById('d_ecg_result').textContent = mData.ecg_result || '--';
                document.getElementById('d_other_medications').textContent = mData.other_medications || '--';
                document.getElementById('d_assistant_notes').textContent = mData.assistant_notes || '--';

                document.getElementById('d_doctor_diagnosis').value = mData.doctor_diagnosis || '';
                document.getElementById('d_prescription').value = mData.prescription || '';
            }
        } catch (e) { }

        // Load extra services for this visit
        this.loadExtraServices(visitId);
    },

    async saveDiagnosis(e) {
        if (e) e.preventDefault();
        if (!this.currentVisitId) return;

        const data = {
            doctor_diagnosis: document.getElementById('d_doctor_diagnosis').value,
            prescription: document.getElementById('d_prescription').value
        };

        try {
            const res = await fetch(`${API_BASE}/visits/${this.currentVisitId}/measurements`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                if (e) showToast('تم تحديث بيانات الكشف بنجاح');
            }
        } catch (error) {
            if (e) showToast('حدث خطأ في الحفظ', 'error');
        }
    },

    async completeVisit() {
        if (!this.currentVisitId) return;
        await this.saveDiagnosis(); // save first

        try {
            const res = await fetch(`${API_BASE}/visits/${this.currentVisitId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' })
            });
            if (res.ok) {
                showToast('تم إنهاء الكشف بنجاح. وانصراف المريض');
                document.getElementById('doctor-panel').classList.add('hidden');
                document.getElementById('d-no-patient-selected').classList.remove('hidden');
                this.currentVisitId = null;
                this.loadQueue();
            }
        } catch (error) {
            showToast('خطأ في إنهاء الكشف', 'error');
        }
    },

    // ---- Extra Services ----
    async loadExtraServices(visitId) {
        const list = document.getElementById('extra-services-list');
        if (!list) return;
        list.innerHTML = '<li style="color:#6b7280;font-size:0.85rem;padding:4px 0;">جاري التحميل...</li>';
        try {
            const res = await fetch(`${API_BASE}/visits/${visitId}/extra_services`);
            const services = await res.json();
            if (services.length === 0) {
                list.innerHTML = '<li style="color:#9ca3af;font-size:0.85rem;padding:4px 0;">لا توجد خدمات إضافية بعد</li>';
                return;
            }
            list.innerHTML = services.map(s => `
                <li style="display:flex; justify-content:space-between; align-items:center;
                    background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:8px 12px; margin-bottom:6px;">
                    <span>🩻 <strong>${s.service_name}</strong>${s.notes ? ' — ' + s.notes : ''}</span>
                    <span style="display:flex; align-items:center; gap:8px;">
                        <strong style="color:#c2410c;">${s.cost} ج</strong>
                        <span style="font-size:0.75rem; color:${s.billed ? '#16a34a' : '#d97706'};">${s.billed ? '✅ تم التحصيل' : '⏳ لم يُحصَّل'}</span>
                        <button onclick="doctorApp.removeExtraService(${s.id})"
                            style="background:#ef4444;color:#fff;border:none;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:0.75rem;">حذف</button>
                    </span>
                </li>`).join('');
        } catch {
            list.innerHTML = '<li style="color:red;font-size:0.85rem;">خطأ في التحميل</li>';
        }
    },

    async addExtraService() {
        const visitId = this.currentVisitId;
        if (!visitId) return showToast('اختر مريضاً أولاً', 'error');
        const name = document.getElementById('extra_service_name').value;
        const notes = document.getElementById('extra_service_notes').value;
        if (!name) return showToast('اختر نوع الخدمة', 'error');

        try {
            const res = await fetch(`${API_BASE}/visits/${visitId}/extra_services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_name: name, cost: 0, notes }) // cost set by reception
            });
            if (res.ok) {
                showToast('✅ تمت إضافة الخدمة');
                document.getElementById('extra_service_notes').value = '';
                this.loadExtraServices(visitId);
            }
        } catch {
            showToast('خطأ في الإضافة', 'error');
        }
    },

    async removeExtraService(serviceId) {
        if (!confirm('هل تريد حذف هذه الخدمة؟')) return;
        try {
            const res = await fetch(`${API_BASE}/extra_services/${serviceId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('تم الحذف');
                this.loadExtraServices(this.currentVisitId);
            }
        } catch {
            showToast('خطأ في الحذف', 'error');
        }
    }
};


// ----------------------------------------------------
// Admin App Logic
// ----------------------------------------------------
const adminApp = {
    roleLabels: { admin: '⚙️ مدير النظام', doctor: '🩺 طبيب', assistant: '🩹 مساعد طبيب', receptionist: '🏨 استقبال' },
    roleClasses: { admin: 'role-admin', doctor: 'role-doctor', assistant: 'role-assistant', receptionist: 'role-receptionist' },

    init() {
        if (!document.getElementById('users-container')) return;
        this.loadUsers();
    },

    async loadUsers() {
        try {
            const res = await fetch(`${API_BASE}/users`);
            if (!res.ok) {
                document.getElementById('users-container').innerHTML = '<p style="color:red;padding:20px;">غير مصرح بالوصول</p>';
                return;
            }
            const users = await res.json();
            this.renderUsers(users);
            this.updateStats(users);
        } catch { showToast('خطأ في تحميل المستخدمين', 'error'); }
    },

    renderUsers(users) {
        const container = document.getElementById('users-container');
        if (!users.length) { container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:30px;">لا يوجد مستخدمون</p>'; return; }
        container.innerHTML = `
            <table class="users-table">
                <thead><tr>
                    <th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الصلاحية</th><th>الشاشة</th><th style="text-align:center;">إجراءات</th>
                </tr></thead>
                <tbody>
                    ${users.map((u, i) => `
                    <tr>
                        <td style="color:#9ca3af;">${i + 1}</td>
                        <td style="font-weight:600;">${u.name}</td>
                        <td dir="ltr" style="text-align:left;color:#4b5563;">${u.username}</td>
                        <td><span class="role-badge ${this.roleClasses[u.role] || ''}">${this.roleLabels[u.role] || u.role}</span></td>
                        <td style="color:#6b7280;font-size:0.85rem;">${this._screenForRole(u.role)}</td>
                        <td style="text-align:center;">
                            <button onclick="adminApp.openEditModal(${u.id},'${u.name.replace(/'/g, "\\'")}','${u.username}','${u.role}')"
                                style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;margin-left:6px;font-family:inherit;">تعديل</button>
                            <button onclick="adminApp.deleteUser(${u.id},'${u.name.replace(/'/g, "\\'")}'"
                                style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-family:inherit;">حذف</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    },

    updateStats(users) {
        document.getElementById('stat-total').textContent = users.length;
        document.getElementById('stat-doctors').textContent = users.filter(u => u.role === 'doctor' || u.role === 'admin').length;
        document.getElementById('stat-assistants').textContent = users.filter(u => u.role === 'assistant').length;
        document.getElementById('stat-reception').textContent = users.filter(u => u.role === 'receptionist').length;
    },

    _screenForRole(role) {
        return { admin: '/admin (كل الشاشات)', doctor: '/doctor', assistant: '/assistant', receptionist: '/reception' }[role] || '—';
    },

    openAddModal() {
        document.getElementById('modal-title').textContent = 'إضافة مستخدم جديد';
        document.getElementById('modal_user_id').value = '';
        ['modal_name', 'modal_username', 'modal_password'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('modal_role').value = 'doctor';
        document.getElementById('password-hint').style.display = 'none';
        document.getElementById('user-modal').style.display = 'flex';
    },

    openEditModal(id, name, username, role) {
        document.getElementById('modal-title').textContent = 'تعديل بيانات مستخدم';
        document.getElementById('modal_user_id').value = id;
        document.getElementById('modal_name').value = name;
        document.getElementById('modal_username').value = username;
        document.getElementById('modal_password').value = '';
        document.getElementById('modal_role').value = role;
        document.getElementById('password-hint').style.display = 'block';
        document.getElementById('user-modal').style.display = 'flex';
    },

    closeModal() { document.getElementById('user-modal').style.display = 'none'; },

    async saveUser() {
        const id = document.getElementById('modal_user_id').value;
        const data = {
            name: document.getElementById('modal_name').value.trim(),
            username: document.getElementById('modal_username').value.trim(),
            role: document.getElementById('modal_role').value,
            password: document.getElementById('modal_password').value,
        };
        if (!data.name || !data.username) return showToast('الاسم واسم المستخدم مطلوبان', 'error');
        if (!id && !data.password) return showToast('كلمة المرور مطلوبة للمستخدمين الجدد', 'error');
        try {
            const res = await fetch(id ? `${API_BASE}/users/${id}` : `${API_BASE}/users`, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) { showToast(result.message || '✅ تمت العملية'); this.closeModal(); this.loadUsers(); }
            else showToast(result.error || 'حدث خطأ', 'error');
        } catch { showToast('خطأ في الاتصال', 'error'); }
    },

    async deleteUser(id, name) {
        if (!confirm(`هل تريد حذف المستخدم "${name}"؟`)) return;
        try {
            const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (res.ok) { showToast('✅ تم حذف المستخدم'); this.loadUsers(); }
            else showToast(result.error || 'خطأ في الحذف', 'error');
        } catch { showToast('خطأ في الاتصال', 'error'); }
    }
};

// ============================================================
// Prescription helpers — injected into doctorApp at runtime
// ============================================================
(function () {
    // list of medicines added to current prescription
    let prescriptionItems = [];

    Object.assign(doctorApp, {

        // Called when patient is selected — clear prescription
        clearPrescription() {
            prescriptionItems = [];
            this._renderPrescriptionList();
            const s = document.getElementById('med_search');
            if (s) s.value = '';
            const instr = document.getElementById('med_instructions');
            if (instr) instr.value = '';
        },

        async searchMedicines() {
            const q = document.getElementById('med_search').value.trim();
            const dd = document.getElementById('med_dropdown');
            if (!dd) return;
            if (q.length < 1) { dd.style.display = 'none'; return; }

            const res = await fetch(`/api/medicines?q=${encodeURIComponent(q)}`);
            const meds = await res.json();
            if (!meds.length) { dd.style.display = 'none'; return; }

            dd.innerHTML = meds.map(m => `
                <div onclick="doctorApp._selectMedicine(${JSON.stringify(m).replace(/"/g, '&quot;')})"
                    style="padding:10px 14px; cursor:pointer; border-bottom:1px solid var(--border-color); font-size:0.9rem;"
                    onmouseover="this.style.background='var(--table-row-hover)'" onmouseout="this.style.background=''">
                    <strong>${m.name}</strong>
                    <span style="color:var(--text-muted); font-size:0.8rem; margin-right:8px;">${m.dosage_form || ''} ${m.strength || ''}</span>
                </div>`).join('');
            dd.style.display = 'block';
        },

        _selectMedicine(m) {
            document.getElementById('med_search').value = m.name;
            document.getElementById('med_instructions').value = m.instructions || '';
            document.getElementById('med_dropdown').style.display = 'none';
            // store selected medicine object for adding
            this._selectedMed = m;
        },

        addMedicineToPrescription() {
            const name = document.getElementById('med_search').value.trim();
            const instructions = document.getElementById('med_instructions').value.trim();
            if (!name) return showToast('ابحث عن دواء أولاً', 'error');
            prescriptionItems.push({
                name,
                dosage_form: this._selectedMed?.dosage_form || '',
                strength: this._selectedMed?.strength || '',
                instructions
            });
            this._selectedMed = null;
            document.getElementById('med_search').value = '';
            document.getElementById('med_instructions').value = '';
            document.getElementById('med_dropdown').style.display = 'none';
            this._renderPrescriptionList();
            // also update text area for saving
            this._syncPrescriptionToTextarea();
        },

        _renderPrescriptionList() {
            const ul = document.getElementById('prescription-list');
            const empty = document.getElementById('prescription-empty');
            if (!ul) return;
            // clear all but the empty placeholder
            [...ul.children].forEach(c => { if (c.id !== 'prescription-empty') c.remove(); });
            if (prescriptionItems.length === 0) {
                if (empty) empty.style.display = 'block';
                return;
            }
            if (empty) empty.style.display = 'none';
            prescriptionItems.forEach((item, idx) => {
                const li = document.createElement('li');
                li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:8px 12px; margin-bottom:6px;';
                li.innerHTML = `
                    <div>
                        <strong style="color:#0369a1;">💊 ${item.name}</strong>
                        <span style="color:#6b7280; font-size:0.8rem; margin-right:8px;">${item.dosage_form} ${item.strength}</span>
                        ${item.instructions ? `<div style="font-size:0.85rem; color:#374151; margin-top:2px;">📋 ${item.instructions}</div>` : ''}
                    </div>
                    <button onclick="doctorApp._removeMed(${idx})"
                        style="background:#ef4444;color:#fff;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:0.75rem;font-family:inherit;">حذف</button>`;
                ul.appendChild(li);
            });
        },

        _removeMed(idx) {
            prescriptionItems.splice(idx, 1);
            this._renderPrescriptionList();
            this._syncPrescriptionToTextarea();
        },

        _syncPrescriptionToTextarea() {
            // Build a text version for saving to DB
            const lines = prescriptionItems.map((m, i) =>
                `${i + 1}. ${m.name}${m.strength ? ' ' + m.strength : ''} — ${m.instructions}`
            ).join('\n');
            const extra = document.getElementById('d_prescription')?.value || '';
            // Save structured list separately in a hidden field so saveDiagnosis can read it
            let hidden = document.getElementById('d_prescription_structured');
            if (!hidden) {
                hidden = document.createElement('textarea');
                hidden.id = 'd_prescription_structured';
                hidden.style.display = 'none';
                document.body.appendChild(hidden);
            }
            hidden.value = lines;
        },

        async printPrescription() {
            const patientName = document.getElementById('d_patient_name')?.textContent || '';
            const fileNum = document.getElementById('d_file_number')?.textContent || '';
            const diagnosis = document.getElementById('d_doctor_diagnosis')?.value || '';
            const notes = document.getElementById('d_prescription')?.value || '';
            const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
            
            let doctorName = document.getElementById('topbar-username')?.textContent || '';
            let clinicName = 'عيادة القلب';
            
            try {
                const res = await fetch(`${API_BASE}/settings`);
                if (res.ok) {
                    const settings = await res.json();
                    if (settings.clinic_name) clinicName = settings.clinic_name;
                    if (settings.doctor_name) doctorName = settings.doctor_name;
                }
            } catch(e) {}

            const medRows = prescriptionItems.length
                ? prescriptionItems.map((m, i) => `
                    <tr>
                        <td style="padding:10px 14px; border-bottom:1px solid #e5e7eb; font-weight:600; color:#1e3a5f;">${i + 1}. ${m.name}</td>
                        <td style="padding:10px 14px; border-bottom:1px solid #e5e7eb; color:#374151;">${m.dosage_form || ''} ${m.strength || ''}</td>
                        <td style="padding:10px 14px; border-bottom:1px solid #e5e7eb; color:#374151;">${m.instructions || ''}</td>
                    </tr>`).join('')
                : `<tr><td colspan="3" style="padding:14px;color:#6b7280;">لم تتم إضافة أدوية</td></tr>`;

            const win = window.open('', '_blank', 'width=800,height=900');
            win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>روشتة طبية</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  body { font-family:'Tajawal',sans-serif; color:#111; margin:0; background:#fff; }
  .page { max-width:720px; margin:0 auto; padding:30px; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1e3a5f; padding-bottom:16px; margin-bottom:20px; }
  .clinic-name { font-size:1.5rem; font-weight:800; color:#1e3a5f; }
  .clinic-sub  { font-size:0.9rem; color:#6b7280; }
  .rx-symbol   { font-size:3rem; color:#0369a1; font-weight:800; }
  .info-grid   { display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f8fafc; padding:14px 18px; border-radius:8px; margin-bottom:20px; }
  .info-item   { font-size:0.9rem; }
  .info-label  { font-weight:700; color:#374151; }
  .section-title { font-size:1rem; font-weight:800; color:#1e3a5f; border-bottom:2px solid #e5e7eb; padding-bottom:6px; margin:18px 0 10px; }
  .diagnosis-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; font-size:0.95rem; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1e3a5f; color:#fff; padding:10px 14px; text-align:right; font-weight:700; }
  .footer { margin-top:40px; display:flex; justify-content:space-between; border-top:1px solid #e5e7eb; padding-top:16px; }
  .signature { text-align:center; }
  .sig-line  { width:160px; border-top:1px solid #999; margin:30px auto 6px; }
  @media print { button { display:none; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="clinic-name">🫀 ${clinicName}</div>
      <div class="clinic-sub">التاريخ: ${today}</div>
    </div>
    <div class="rx-symbol">℞</div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span class="info-label">المريض: </span>${patientName}</div>
    <div class="info-item"><span class="info-label">رقم الملف: </span>${fileNum}</div>
    <div class="info-item"><span class="info-label">الطبيب: </span>${doctorName}</div>
    <div class="info-item"><span class="info-label">التاريخ: </span>${today}</div>
  </div>

  ${diagnosis ? `<div class="section-title">التشخيص</div>
  <div class="diagnosis-box">${diagnosis}</div>` : ''}

  <div class="section-title">الأدوية الموصوفة</div>
  <table>
    <thead><tr><th>الدواء</th><th>الشكل / الجرعة</th><th>التعليمات</th></tr></thead>
    <tbody>${medRows}</tbody>
  </table>

  ${notes ? `<div class="section-title">ملاحظات إضافية</div>
  <div class="diagnosis-box">${notes}</div>` : ''}

  <div class="footer">
    <div class="signature">
      <div class="sig-line"></div>
      <div style="font-size:0.85rem; color:#6b7280;">توقيع الطبيب</div>
    </div>
    <div style="font-size:0.75rem; color:#6b7280; align-self:flex-end;">
      هذه الروشتة سارية لمدة ثلاثة أشهر من تاريخ إصدارها
    </div>
  </div>

  <div style="text-align:center; margin-top:20px;">
    <button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-family:Tajawal;font-size:1rem;cursor:pointer;">🖨️ طباعة</button>
  </div>
</div>
</body>
</html>`);
            win.document.close();
        }
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
        const dd = document.getElementById('med_dropdown');
        if (dd && !e.target.closest('#med_search') && !e.target.closest('#med_dropdown')) {
            dd.style.display = 'none';
        }
    });

    // Clear prescription when new patient is loaded (patch selectPatient)
    const origSelect = doctorApp.selectPatient.bind(doctorApp);
    doctorApp.selectPatient = async function (...args) {
        await origSelect(...args);
        doctorApp.clearPrescription();
    };
})();

// ============================================================
// Theme App Logic
// ============================================================
const themeApp = {
    init() {
        this.loadLocalThemeMode();
        this.applyCurrentUserTheme();
    },

    loadLocalThemeMode() {
        const mode = localStorage.getItem('theme_mode') || 'light';
        document.documentElement.setAttribute('data-theme', mode);
        this.updateToggleButton(mode);
    },

    toggleDarkMode() {
        let current = document.documentElement.getAttribute('data-theme') || 'light';
        let next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme_mode', next);
        this.updateToggleButton(next);

        // Reset custom backgrounds to not fight with dark mode variables setup
        this.applyCurrentUserTheme();
    },

    updateToggleButton(mode) {
        const btn = document.getElementById('dark-mode-toggle-btn');
        if (btn) {
            btn.innerHTML = mode === 'dark' ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي';
        }
    },

    async applyCurrentUserTheme() {
        try {
            const res = await fetch('/api/current_user');
            if (res.ok) {
                const user = await res.json();
                const currentMode = document.documentElement.getAttribute('data-theme');

                if (user.theme_color) {
                    document.documentElement.style.setProperty('--primary-color', user.theme_color);
                    const isPrimaryDark = this.isColorDark(user.theme_color);
                    document.documentElement.style.setProperty('--primary-text', isPrimaryDark ? '#ffffff' : '#1f2937');
                }

                // Only override backgrounds if NOT in dark mode to prevent conflicts
                if (user.theme_bg && currentMode !== 'dark') {
                    document.documentElement.style.setProperty('--background-color', user.theme_bg);
                    const isBgDark = this.isColorDark(user.theme_bg);
                    if (isBgDark) {
                        document.documentElement.style.setProperty('--text-main', '#f8fafc');
                        document.documentElement.style.setProperty('--card-bg', 'rgba(30, 41, 59, 0.9)');
                    } else {
                        document.documentElement.style.setProperty('--text-main', '#1f2937');
                        document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.9)');
                    }
                } else if (currentMode === 'dark') {
                    // Reset variables so CSS takes over
                    document.documentElement.style.removeProperty('--background-color');
                    document.documentElement.style.removeProperty('--text-main');
                    document.documentElement.style.removeProperty('--card-bg');
                } else {
                    // In light mode with no user preference, reset to default
                    document.documentElement.style.removeProperty('--background-color');
                    document.documentElement.style.removeProperty('--text-main');
                    document.documentElement.style.removeProperty('--card-bg');
                }
            }
        } catch (e) { }
    },

    isColorDark(hex) {
        if (!hex) return false;
        let c = hex.substring(1);
        let rgb = parseInt(c, 16);
        let r = (rgb >> 16) & 0xff;
        let g = (rgb >> 8) & 0xff;
        let b = (rgb >> 0) & 0xff;
        let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma < 128;
    },

    openSettings() {
        let modal = document.getElementById('theme-settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'theme-settings-modal';
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';

            const currentPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#2563eb';
            const currentBg = getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim() || '#f3f4f6';

            modal.innerHTML = `
                <div class="modal-box" style="width: 350px; background:var(--modal-bg); color:var(--text-main);">
                    <h3 style="margin-top:0; color:var(--primary-color);">🎨 تخصيص ألوان النظام</h3>
                    <div class="form-group">
                        <label>اللون الأساسي (Primary Color)</label>
                        <input type="color" id="theme_primary_picker" value="${currentPrimary}" style="height:50px; padding:5px; border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>لون الخلفية الفاتحة</label>
                        <input type="color" id="theme_bg_picker" value="${currentBg}" style="height:50px; padding:5px; border-radius:8px;">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:24px;">
                        <button class="btn" onclick="themeApp.saveTheme()" style="flex:1;">حفظ</button>
                        <button class="btn btn-secondary" onclick="document.getElementById('theme-settings-modal').remove()" style="flex:1;">إلغاء</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.style.display = 'flex';
        }
    },

    async saveTheme() {
        const primary = document.getElementById('theme_primary_picker').value;
        const bg = document.getElementById('theme_bg_picker').value;

        try {
            const res = await fetch('/api/user/theme', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme_color: primary, theme_bg: bg })
            });
            if (res.ok) {
                showToast('✅ تم حفظ الألوان الخاصة بك');
                document.getElementById('theme-settings-modal').remove();
                this.applyCurrentUserTheme();
            } else {
                showToast('خطأ في حفظ الألوان', 'error');
            }
        } catch (e) {
            showToast('خطأ في الاتصال', 'error');
        }
    }
};

// Auto-run theme initialization
document.addEventListener('DOMContentLoaded', () => {
    themeApp.init();
});
