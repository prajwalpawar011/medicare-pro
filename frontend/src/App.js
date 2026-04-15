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

  // --- DATA LOGIC ---
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const [hour, minute] = timeString.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  const fetchData = async (tabName) => {
    try {
      const endpoint = collectionMap[tabName];
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

  if (!isAuthenticated) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-dark">
        <div className="card p-4 shadow-lg border-0" style={{ width: '380px' }}>
          <div className="text-center mb-4">
            <h1 style={{fontSize: '50px'}}>🏥</h1>
            <h3 className="fw-bold">Medicare Staff</h3>
            <p className="text-muted small">Please sign in to continue</p>
          </div>
          <form onSubmit={handleLogin}>
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
          {/* STATS OVERVIEW */}
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
                {list.map((item, index) => (
                  <tr key={item._id || index}>
                    <td className="text-muted small">{index + 1}</td>
                    <td className="fw-bold">{item.patientName || item.name || "N/A"}</td>
                    <td>
                      {activeTab === 'Appointments' ? (
                        <div>
                          {/* Prefix check to prevent Dr. Dr. */}
                          <strong>{item.doctorName?.startsWith('Dr.') ? item.doctorName : `Dr. ${item.doctorName}`}</strong><br/>
                          <small className="text-muted">📅 {item.date || 'N/A'} | 🕒 {formatTime(item.time)}</small>
                          {item.description && <p className="mb-0 small italic">📝 {item.description}</p>}
                        </div>
                      ) : (
                        <span>{activeTab === 'Billing' ? `₹${item.details}` : item.details}</span>
                      )}
                    </td>
                    {activeTab === 'Billing' && <><td>{item.service}</td><td><small className="fw-bold">{item.paymentMethod}</small></td></>}
                    <td>
                      <span className={`badge rounded-pill ${['Confirmed', 'Admitted', 'Paid', 'Completed', 'In Stock', 'On Duty'].includes(item.status) ? 'bg-success' : ['Pending', 'Unpaid', 'Report Pending', 'Sample Collected'].includes(item.status) ? 'bg-warning text-dark' : 'bg-danger'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-center"><button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(item._id)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
