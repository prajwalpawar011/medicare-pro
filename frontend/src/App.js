import React, { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('token') ? true : false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // --- DASHBOARD STATE ---
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('Patients');
  const [list, setList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);

  // --- PATIENT PORTAL STATE ---
  const [patientToken, setPatientToken] = useState(localStorage.getItem('patientToken'));
  const [patientData, setPatientData] = useState(null);
  const [showPatientRegister, setShowPatientRegister] = useState(false);
  const [isPatientLoginMode, setIsPatientLoginMode] = useState(true);
  const [patientLoginData, setPatientLoginData] = useState({ email: '', password: '' });
  const [patientRegisterData, setPatientRegisterData] = useState({ name: '', email: '', password: '', phone: '', age: '', dateOfBirth: '' });
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({ doctorId: '', doctorName: '', appointmentDate: '', reason: '' });
  const [patientAppointments, setPatientAppointments] = useState([]);

  const collectionMap = {
    'Patients': 'patients',
    'Doctors': 'doctors',
    'Appointments': 'appointments',
    'Billing': 'billing',
    'Pharmacy': 'pharmacy',
    'LabTests': 'labtests'
  };

  // --- AUTH LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/login', loginData);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setIsAuthenticated(true);
      }
    } catch (err) {
      alert("❌ Invalid Credentials. Try admin / admin123");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  // --- PATIENT PORTAL FUNCTIONS ---
  const handlePatientRegister = async (e) => {
    e.preventDefault();
    try {
      const registerData = {
        ...patientRegisterData,
        age: parseInt(patientRegisterData.age),
        details: patientRegisterData.age
      };
      
      const res = await axios.post('http://localhost:5000/patient/register', registerData);
      if (res.data.success) {
        localStorage.setItem('patientToken', res.data.token);
        setPatientToken(res.data.token);
        setPatientData(res.data.patient);
        setShowPatientRegister(false);
        fetchPatientAppointments(res.data.token);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/patient/login', patientLoginData);
      if (res.data.success) {
        localStorage.setItem('patientToken', res.data.token);
        setPatientToken(res.data.token);
        setPatientData(res.data.patient);
        fetchPatientAppointments(res.data.token);
      }
    } catch (err) {
      alert("Invalid email or password");
    }
  };

  const fetchPatientAppointments = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/patient/my-appointments', {
        headers: { 'x-auth-token': token }
      });
      setPatientAppointments(res.data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const fetchDoctorsForPatient = async () => {
    try {
      const res = await axios.get('http://localhost:5000/patient/doctors');
      setAvailableDoctors(res.data);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const handleRequestAppointment = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/patient/request-appointment', bookingData, {
        headers: { 'x-auth-token': patientToken }
      });
      alert("✅ Appointment requested successfully! Staff will confirm soon.");
      setShowBookingForm(false);
      fetchPatientAppointments(patientToken);
      setBookingData({ doctorId: '', doctorName: '', appointmentDate: '', reason: '' });
    } catch (err) {
      alert("❌ Error requesting appointment");
    }
  };

  const handlePatientLogout = () => {
    localStorage.removeItem('patientToken');
    setPatientToken(null);
    setPatientData(null);
    setPatientAppointments([]);
  };

  // --- FORMAT TIME FUNCTION (Uppercase AM/PM, no seconds) ---
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    
    let hours, minutes;
    
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      hours = parseInt(parts[0]);
      minutes = parts[1];
      
      if (minutes.includes(' ')) {
        minutes = minutes.split(' ')[0];
      }
      if (minutes.length > 2) {
        minutes = minutes.substring(0, 2);
      }
    } else {
      return timeString;
    }
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = hours % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // --- FORMAT DATE & TIME FOR PATIENT PORTAL ---
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedTime = `${hours}:${minutes} ${ampm}`;
    return `${formattedDate} ${formattedTime}`;
  };

  const fetchData = async (tabName) => {
    try {
      let endpoint = collectionMap[tabName];
      if (tabName === 'Appointments') {
        endpoint = 'appointments';
      }
      const res = await axios.get(`http://localhost:5000/get/${endpoint}`);
      setList(res.data);
      setActiveTab(tabName);
    } catch (err) {
      console.error("Fetch error:", err);
      setList([]);
    }
  };

  const fetchDoctorsForDropdown = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/get/doctors`);
      setDoctorsList(res.data);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const updateAppointmentStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/update/appointment/${id}/status`, { status: newStatus });
      alert(`✅ Appointment ${newStatus}`);
      fetchData('Appointments');
    } catch (err) {
      alert("❌ Error updating status");
    }
  };

  const updatePatientStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/update/patient/${id}/status`, { status: newStatus });
      alert(`✅ Patient status updated to ${newStatus}`);
      fetchData('Patients');
    } catch (err) {
      alert("❌ Error updating status");
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchData('Patients');
  }, [isAuthenticated]);

  useEffect(() => {
    if (showForm) {
      if (activeTab === 'Appointments') fetchDoctorsForDropdown();
      const statusDefaults = {
        'Patients': 'Admitted', 'Appointments': 'Pending', 'Billing': 'Unpaid',
        'Pharmacy': 'In Stock', 'LabTests': 'Report Pending', 'Doctors': 'On Duty'
      };
      const initialData = { status: statusDefaults[activeTab] || 'Active' };
      if (activeTab === 'Billing') initialData.paymentMethod = 'UPI';
      setFormData(initialData);
    }
  }, [showForm, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = collectionMap[activeTab];
      const response = await axios.post(`http://localhost:5000/add/${endpoint}`, formData);
      if (response.status === 201) {
        alert(`✅ ${activeTab.slice(0, -1)} added!`);
        setShowForm(false);
        fetchData(activeTab);
      }
    } catch (err) { alert("❌ Error adding record."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete record?")) {
      try {
        await axios.delete(`http://localhost:5000/delete/${collectionMap[activeTab]}/${id}`);
        fetchData(activeTab); 
      } catch (err) { alert("Error deleting."); }
    }
  };

  if (!isAuthenticated && !patientToken) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-dark">
        <div className="card p-4 shadow-lg border-0" style={{ width: '400px' }}>
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button className={`nav-link ${!showPatientRegister ? 'active' : ''}`} onClick={() => {
                setShowPatientRegister(false);
                setIsPatientLoginMode(true);
              }}>
                Staff Login
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${showPatientRegister ? 'active' : ''}`} onClick={() => {
                setShowPatientRegister(true);
                setIsPatientLoginMode(true);
              }}>
                Patient Portal
              </button>
            </li>
          </ul>
          
          {!showPatientRegister ? (
            <form onSubmit={handleLogin}>
              <div className="text-center mb-4">
                <h1 style={{fontSize: '50px'}}>🏥</h1>
                <h3 className="fw-bold">Medicare Staff</h3>
                <p className="text-muted small">Please sign in to continue</p>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-uppercase">Username</label>
                <input type="text" className="form-control" required onChange={(e) => setLoginData({...loginData, username: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold text-uppercase">Password</label>
                <input type="password" className="form-control" required onChange={(e) => setLoginData({...loginData, password: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary w-100 py-2 shadow-sm">Login to Portal</button>
            </form>
          ) : (
            <div>
              <div className="text-center mb-4">
                <h1 style={{fontSize: '50px'}}>👤</h1>
                <h3 className="fw-bold">Patient Portal</h3>
                <p className="text-muted small">Access your health records & appointments</p>
              </div>
              
              <ul className="nav nav-pills mb-3 justify-content-center">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${isPatientLoginMode ? 'active' : ''}`} 
                    onClick={() => {
                      setIsPatientLoginMode(true);
                      setPatientLoginData({ email: '', password: '' });
                    }}
                  >
                    Login
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${!isPatientLoginMode ? 'active' : ''}`} 
                    onClick={() => {
                      setIsPatientLoginMode(false);
                      setPatientRegisterData({ name: '', email: '', password: '', phone: '', age: '', dateOfBirth: '' });
                    }}
                  >
                    Register
                  </button>
                </li>
              </ul>
              
              {isPatientLoginMode ? (
                <form onSubmit={handlePatientLogin}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required 
                      value={patientLoginData.email}
                      onChange={(e) => setPatientLoginData({...patientLoginData, email: e.target.value})} 
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label">Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      required 
                      value={patientLoginData.password}
                      onChange={(e) => setPatientLoginData({...patientLoginData, password: e.target.value})} 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100">Login as Patient</button>
                </form>
              ) : (
                <form onSubmit={handlePatientRegister}>
                  <div className="mb-2">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Full Name" 
                      required 
                      value={patientRegisterData.name}
                      onChange={(e) => setPatientRegisterData({...patientRegisterData, name: e.target.value})} 
                    />
                  </div>
                  <div className="mb-2">
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="Email" 
                      required 
                      value={patientRegisterData.email}
                      onChange={(e) => setPatientRegisterData({...patientRegisterData, email: e.target.value})} 
                    />
                  </div>
                  <div className="mb-2">
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Password" 
                      required 
                      value={patientRegisterData.password}
                      onChange={(e) => setPatientRegisterData({...patientRegisterData, password: e.target.value})} 
                    />
                  </div>
                  <div className="mb-2">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Phone" 
                      value={patientRegisterData.phone}
                      onChange={(e) => setPatientRegisterData({...patientRegisterData, phone: e.target.value})} 
                    />
                  </div>
                  <div className="mb-2">
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Age" 
                      required
                      value={patientRegisterData.age}
                      onChange={(e) => setPatientRegisterData({...patientRegisterData, age: e.target.value})} 
                    />
                  </div>
                  <div className="mb-3">
                    <input 
                      type="date" 
                      className="form-control" 
                      placeholder="Date of Birth (Optional)" 
                      value={patientRegisterData.dateOfBirth}
                      onChange={(e) => setPatientRegisterData({...patientRegisterData, dateOfBirth: e.target.value})} 
                    />
                  </div>
                  <button type="submit" className="btn btn-success w-100">Register & Login</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (patientToken && !isAuthenticated) {
    return (
      <div className="container-fluid">
        <div className="row">
          <nav className="col-md-2 d-none d-md-block bg-primary sidebar vh-100 p-3 shadow text-white">
            <h4 className="text-white mb-4">👤 Patient Portal</h4>
            <div className="text-center mb-4">
              <p className="mb-0">Welcome,</p>
              <h5>{patientData?.name}</h5>
              <small>{patientData?.email}</small>
              {patientData?.age && <div><small>Age: {patientData.age}</small></div>}
            </div>
            <hr />
            <button className="btn btn-outline-light w-100 mb-2" onClick={() => {
              fetchPatientAppointments(patientToken);
              setShowBookingForm(false);
            }}>📋 My Appointments</button>
            <button className="btn btn-outline-light w-100 mb-2" onClick={() => {
              fetchDoctorsForPatient();
              setShowBookingForm(true);
            }}>📅 Book Appointment</button>
            <hr />
            <button className="btn btn-danger w-100" onClick={handlePatientLogout}>Logout</button>
          </nav>
          
          <main className="col-md-10 p-4 bg-light vh-100 overflow-auto">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white">
                <h4 className="mb-0">{showBookingForm ? "Book New Appointment" : "My Appointment History"}</h4>
              </div>
              <div className="card-body">
                {showBookingForm ? (
                  <form onSubmit={handleRequestAppointment}>
                    <div className="mb-3">
                      <label className="form-label">Select Doctor</label>
                      <select className="form-select" required onChange={(e) => {
                        const selected = availableDoctors.find(d => d._id === e.target.value);
                        setBookingData({...bookingData, doctorId: e.target.value, doctorName: selected?.name});
                      }}>
                        <option value="">Choose Doctor...</option>
                        {availableDoctors.map(doc => (
                          <option key={doc._id} value={doc._id}>{doc.name} - {doc.details || 'General'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Appointment Date & Time</label>
                      <input type="datetime-local" className="form-control" required onChange={(e) => setBookingData({...bookingData, appointmentDate: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Reason for Visit</label>
                      <textarea className="form-control" rows="3" required onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}></textarea>
                    </div>
                    <div className="alert alert-info mt-3">
                      <small>
                        <strong>📌 Note:</strong> After booking, your appointment status will be <strong>"Pending"</strong>. 
                        Please wait for staff confirmation.
                      </small>
                    </div>
                    <button type="submit" className="btn btn-primary">Submit Request</button>
                    <button type="button" className="btn btn-secondary ms-2" onClick={() => setShowBookingForm(false)}>Cancel</button>
                  </form>
                ) : (
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Doctor</th>
                        <th>Date & Time</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientAppointments.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5">No appointments found</td></tr>
                      ) : (
                        patientAppointments.map((apt, idx) => (
                          <tr key={idx}>
                            <td className="text-muted">{idx + 1}</td>
                            <td><strong>{apt.doctorName}</strong></td>
                            <td>{formatDateTime(apt.appointmentDate)}</td>
                            <td>{apt.reason}</td>
                            <td>
                              {apt.status === 'Confirmed' ? (
                                <span className="badge bg-success">✅ Confirmed</span>
                              ) : apt.status === 'Pending' ? (
                                <span className="badge bg-warning text-dark">⏳ Pending</span>
                              ) : (
                                <span className="badge bg-danger">❌ Cancelled</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <nav className="col-md-2 d-none d-md-block bg-dark sidebar vh-100 p-3 shadow text-white">
          <h4 className="text-white mb-4">🏥 MediCare+</h4>
          <div className="nav flex-column nav-pills">
            {Object.keys(collectionMap).map(tab => (
              <button key={tab} className={`nav-link text-start mb-2 ${activeTab === tab ? 'active' : 'text-white'}`} onClick={() => fetchData(tab)}>
                {tab}
              </button>
            ))}
            <hr className="text-secondary" />
            <button className="btn btn-outline-danger btn-sm w-100 mt-2" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <main className="col-md-10 p-4 bg-light overflow-auto vh-100">
          <div className="row mb-4">
             <div className="col-md-3">
                <div className="card border-0 shadow-sm p-3 bg-white border-start border-primary border-4">
                   <small className="text-muted fw-bold text-uppercase">Total Patients</small>
                   <h3 className="fw-bold">{activeTab === 'Patients' ? list.length : '--'}</h3>
                </div>
             </div>
             <div className="col-md-3">
                <div className="card border-0 shadow-sm p-3 bg-white border-start border-success border-4">
                   <small className="text-muted fw-bold text-uppercase">Total Revenue</small>
                   <h3 className="fw-bold text-success">₹{activeTab === 'Billing' ? list.reduce((a, b) => a + (parseInt(b.details) || 0), 0) : '--'}</h3>
                </div>
             </div>
             <div className="col-md-3">
                <div className="card border-0 shadow-sm p-3 bg-white border-start border-warning border-4">
                   <small className="text-muted fw-bold text-uppercase">Confirmed Appt.</small>
                   <h3 className="fw-bold">{activeTab === 'Appointments' ? list.filter(i => i.status === 'Confirmed').length : '--'}</h3>
                </div>
             </div>
             <div className="col-md-3">
                <div className="card border-0 shadow-sm p-3 bg-white border-start border-info border-4">
                   <small className="text-muted fw-bold text-uppercase">Doctors On Duty</small>
                   <h3 className="fw-bold">{activeTab === 'Doctors' ? list.filter(i => i.status === 'On Duty').length : '--'}</h3>
                </div>
             </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold text-secondary">{activeTab} Management</h2>
            <button className="btn btn-primary px-4 shadow-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Close Form" : `+ Add New ${activeTab.slice(0, -1)}`}
            </button>
          </div>

          {showForm && (
            <div className="card p-4 mb-4 shadow border-0">
              <h5 className="mb-3 text-primary">New {activeTab.slice(0, -1)} Entry</h5>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label fw-bold small uppercase">Name / Patient</label>
                    <input type="text" className="form-control" required onChange={(e) => setFormData(activeTab === 'Appointments' ? {...formData, patientName: e.target.value} : {...formData, name: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small uppercase">
                        {activeTab === 'Patients' ? 'Age' : activeTab === 'Doctors' ? 'Specialization' : 
                         activeTab === 'Billing' ? 'Amount (₹)' : activeTab === 'Pharmacy' ? 'Medicine' : 
                         activeTab === 'LabTests' ? 'Test Type' : 'Doctor'}
                    </label>
                    {activeTab === 'Appointments' ? (
                       <select className="form-select" required onChange={(e) => setFormData({...formData, doctorName: e.target.value})}>
                        <option value="">-- Choose --</option>
                        {doctorsList.map(doc => <option key={doc._id} value={doc.name}>{doc.name}</option>)}
                      </select>
                    ) : <input type="text" className="form-control" required onChange={(e) => setFormData({...formData, details: e.target.value})} />}
                  </div>

                  {activeTab === 'Billing' && (
                    <>
                      <div className="col-md-2"><label className="form-label fw-bold small">Service</label><input type="text" className="form-control" required onChange={(e) => setFormData({...formData, service: e.target.value})} /></div>
                      <div className="col-md-2"><label className="form-label fw-bold small">Method</label><select className="form-select" onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}><option value="UPI">UPI</option><option value="Cash">Cash</option><option value="Card">Card</option></select></div>
                    </>
                  )}

                  {activeTab === 'Appointments' && (
                    <>
                      <div className="col-md-2"><label className="form-label fw-bold small">Date</label><input type="date" className="form-control" required onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                      <div className="col-md-2"><label className="form-label fw-bold small">Time</label><input type="time" className="form-control" required onChange={(e) => setFormData({...formData, time: e.target.value})} /></div>
                      <div className="col-md-4"><label className="form-label fw-bold small">Description</label><input type="text" className="form-control" onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                    </>
                  )}

                  <div className="col-md-2"><label className="form-label fw-bold small">Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      {activeTab === 'Patients' && <><option value="Admitted">Admitted</option><option value="Discharged">Discharged</option><option value="Recovered">Recovered</option></>}
                      {activeTab === 'Appointments' && <><option value="Pending">Pending</option><option value="Confirmed">Confirmed</option><option value="Cancelled">Cancelled</option></>}
                      {activeTab === 'Billing' && <><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option></>}
                      {activeTab === 'Pharmacy' && <><option value="In Stock">In Stock</option><option value="Out of Stock">Out of Stock</option></>}
                      {activeTab === 'LabTests' && <><option value="Report Pending">Report Pending</option><option value="Completed">Completed</option><option value="Sample Collected">Sample Collected</option></>}
                      {activeTab === 'Doctors' && <><option value="On Duty">On Duty</option><option value="Off Duty">Off Duty</option></>}
                  </select></div>
                  <div className="col-12 text-end"><button type="submit" className="btn btn-success px-5">Save Record</button></div>
                </div>
              </form>
            </div>
          )}

          <div className="card shadow-sm border-0 p-3 bg-white">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>
                    {activeTab === 'Appointments' ? 'Doctor' : 
                     activeTab === 'Patients' ? 'Age' : 
                     activeTab === 'Doctors' ? 'Specialization' : 
                     activeTab === 'Billing' ? 'Amount' : 
                     activeTab === 'Pharmacy' ? 'Medicine' : 'Details'}
                  </th>
                  {activeTab === 'Billing' && <><th>Service</th><th>Method</th></>}
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, index) => {
                  // Format time to uppercase AM/PM for staff appointments
                  let formattedTime = "N/A";
                  if (activeTab === 'Appointments') {
                    if (item.time) {
                      formattedTime = formatTime(item.time);
                    } else if (item.appointmentDate) {
                      const date = new Date(item.appointmentDate);
                      let hours = date.getHours();
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12 || 12;
                      formattedTime = `${hours}:${minutes} ${ampm}`;
                    }
                  }
                  
                  return (
                    <tr key={item._id || index}>
                      <td className="text-muted small">{index + 1}</td>
                      <td className="fw-bold">{item.patientName || item.name || "N/A"}</td>
                      <td>
                        {activeTab === 'Appointments' ? (
                          <div>
                            <strong>{item.doctorName?.startsWith('Dr.') ? item.doctorName : `Dr. ${item.doctorName}`}</strong><br/>
                            <small className="text-muted">
                              📅 {item.date || (item.appointmentDate ? new Date(item.appointmentDate).toLocaleDateString() : 'N/A')} 
                              | 🕒 {formattedTime}
                            </small>
                            {item.description && <p className="mb-0 small italic">📝 {item.description}</p>}
                            {item.reason && !item.description && <p className="mb-0 small italic">📝 {item.reason}</p>}
                          </div>
                        ) : (
                          <span>{activeTab === 'Billing' ? `₹${item.details}` : item.details}</span>
                        )}
                      </td>
                      {activeTab === 'Billing' && <>
                        <td>{item.service}</td>
                        <td><small className="fw-bold">{item.paymentMethod}</small></td>
                      </>}
                      <td>
                        {activeTab === 'Appointments' ? (
                          <select 
                            className={`form-select form-select-sm ${item.status === 'Confirmed' ? 'bg-success text-white' : item.status === 'Pending' ? 'bg-warning' : 'bg-danger text-white'}`}
                            value={item.status}
                            style={{ width: '120px' }}
                            onChange={(e) => updateAppointmentStatus(item._id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        ) : activeTab === 'Patients' ? (
                          <select 
                            className={`form-select form-select-sm ${item.status === 'Admitted' ? 'bg-primary text-white' : 
                                       item.status === 'Recovered' ? 'bg-success text-white' : 
                                       item.status === 'Discharged' ? 'bg-secondary text-white' :
                                       'bg-primary text-white'}`}
                            value={item.status || 'Admitted'}
                            style={{ width: '130px', fontSize: '12px' }}
                            onChange={(e) => updatePatientStatus(item._id, e.target.value)}
                          >
                            <option value="Admitted">🏥 Admitted</option>
                            <option value="Recovered">✅ Recovered</option>
                            <option value="Discharged">🚪 Discharged</option>
                          </select>
                        ) : (
                          <span className={`badge rounded-pill ${['Confirmed', 'Admitted', 'Paid', 'Completed', 'In Stock', 'On Duty'].includes(item.status) ? 'bg-success' : ['Pending', 'Unpaid', 'Report Pending', 'Sample Collected'].includes(item.status) ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(item._id)}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;