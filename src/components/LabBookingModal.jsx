import React, { useState, useEffect, useContext } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './LabBookingModal.css';

const LABS = [
  {
    id: 'mac-lab',
    name: 'Mac Lab (Adobe CC)',
    icon: '🖥️',
    description: 'Adobe Creative Cloud workstations with InDesign, Illustrator & Photoshop',
    capacity: 30,
    color: '#4f46e5',
  },
  {
    id: 'screen-printing',
    name: 'Screen Printing & Pre-press',
    icon: '🖨️',
    description: 'Silk-screen printing, film output, and pre-press equipment',
    capacity: 15,
    color: '#0891b2',
  },
  {
    id: 'photo-studio',
    name: 'Photography & Lighting Studio',
    icon: '📸',
    description: 'Professional lighting rigs, backdrops, and camera equipment',
    capacity: 10,
    color: '#7c3aed',
  },
];

const TIME_SLOTS = [
  '08:00 AM – 10:00 AM',
  '10:00 AM – 12:00 PM',
  '12:00 PM – 02:00 PM',
  '02:00 PM – 04:00 PM',
  '04:00 PM – 06:00 PM',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const STORAGE_KEY = 'ttu_lab_bookings';

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  return DAYS.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: day,
      date: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' }),
    };
  });
}

export default function LabBookingModal({ onClose }) {
  const { currentUser } = useContext(DbContext);
  const [bookings, setBookings] = useState([]);
  const [selectedLab, setSelectedLab] = useState(LABS[0].id);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState('');
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'mine'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const weekDates = getWeekDates();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setBookings(saved);
    } catch {
      setBookings([]);
    }
  }, []);

  const saveBookings = (updated) => {
    setBookings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isSlotTaken = (labId, date, slot) =>
    bookings.some(b => b.labId === labId && b.date === date && b.slot === slot);

  const myBookings = bookings.filter(b => b.userId === currentUser?.id);

  const handleBook = () => {
    setErrorMsg('');
    if (selectedSlot === null) {
      setErrorMsg('Please select a time slot.');
      return;
    }
    if (!purpose.trim()) {
      setErrorMsg('Please enter a brief purpose / project name.');
      return;
    }

    const date = weekDates[selectedDay].date;
    const slot = TIME_SLOTS[selectedSlot];

    if (isSlotTaken(selectedLab, date, slot)) {
      setErrorMsg('This slot is already booked. Please choose another time or lab.');
      return;
    }

    const booking = {
      id: `book_${Date.now()}`,
      userId: currentUser?.id,
      userName: currentUser?.name,
      labId: selectedLab,
      labName: LABS.find(l => l.id === selectedLab)?.name,
      date,
      dayLabel: weekDates[selectedDay].label,
      slot,
      purpose: purpose.trim(),
      bookedAt: new Date().toISOString(),
    };

    saveBookings([...bookings, booking]);
    setSuccessMsg(`✅ Booked! ${booking.labName} on ${booking.dayLabel} (${booking.slot})`);
    setPurpose('');
    setSelectedSlot(null);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCancel = (bookingId) => {
    const updated = bookings.filter(b => b.id !== bookingId);
    saveBookings(updated);
  };

  const selectedLabData = LABS.find(l => l.id === selectedLab);

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="lab-booking-modal glass-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lab-modal-header">
          <div>
            <h2 className="lab-modal-title">🏛️ Studio & Lab Booking</h2>
            <p className="lab-modal-subtitle">Reserve a 2-hour slot for your design work</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className="lab-tabs">
          <button
            className={`lab-tab ${activeTab === 'book' ? 'active' : ''}`}
            onClick={() => setActiveTab('book')}
          >
            📅 Book a Slot
          </button>
          <button
            className={`lab-tab ${activeTab === 'mine' ? 'active' : ''}`}
            onClick={() => setActiveTab('mine')}
          >
            📋 My Bookings {myBookings.length > 0 && <span className="tab-badge">{myBookings.length}</span>}
          </button>
        </div>

        {activeTab === 'book' ? (
          <div className="lab-book-panel">
            {/* Lab Selection */}
            <div className="lab-section">
              <label className="lab-section-label">1. Select Lab / Studio</label>
              <div className="lab-grid">
                {LABS.map(lab => (
                  <button
                    key={lab.id}
                    className={`lab-card ${selectedLab === lab.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedLab(lab.id); setSelectedSlot(null); }}
                    style={{ '--lab-color': lab.color }}
                  >
                    <span className="lab-card-icon">{lab.icon}</span>
                    <strong className="lab-card-name">{lab.name}</strong>
                    <span className="lab-card-desc">{lab.description}</span>
                    <span className="lab-capacity">Capacity: {lab.capacity}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Day Selection */}
            <div className="lab-section">
              <label className="lab-section-label">2. Choose Day (This Week)</label>
              <div className="day-selector">
                {weekDates.map((day, i) => (
                  <button
                    key={day.date}
                    className={`day-btn ${selectedDay === i ? 'active' : ''}`}
                    onClick={() => { setSelectedDay(i); setSelectedSlot(null); }}
                  >
                    <span className="day-name">{day.label.slice(0, 3)}</span>
                    <span className="day-date">{day.display}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="lab-section">
              <label className="lab-section-label">3. Pick a Time Slot</label>
              <div className="slot-grid">
                {TIME_SLOTS.map((slot, i) => {
                  const taken = isSlotTaken(selectedLab, weekDates[selectedDay].date, slot);
                  const mine = bookings.find(
                    b => b.userId === currentUser?.id &&
                         b.labId === selectedLab &&
                         b.date === weekDates[selectedDay].date &&
                         b.slot === slot
                  );
                  return (
                    <button
                      key={slot}
                      className={`slot-btn ${taken ? 'taken' : ''} ${selectedSlot === i && !taken ? 'selected' : ''} ${mine ? 'mine' : ''}`}
                      onClick={() => !taken && setSelectedSlot(i)}
                      disabled={taken}
                      title={taken ? (mine ? 'Your booking' : 'Slot taken') : 'Available'}
                    >
                      <span className="slot-time">{slot}</span>
                      {mine && <span className="slot-tag mine-tag">Mine</span>}
                      {taken && !mine && <span className="slot-tag taken-tag">Booked</span>}
                      {!taken && <span className="slot-tag open-tag">Available</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Purpose */}
            <div className="lab-section">
              <label className="lab-section-label" htmlFor="lab-purpose">4. Purpose / Project Name</label>
              <input
                id="lab-purpose"
                className="lab-input"
                type="text"
                placeholder="e.g. Magazine Layout Final Print, Typography Poster..."
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                maxLength={120}
              />
            </div>

            {errorMsg && <div className="lab-error">{errorMsg}</div>}
            {successMsg && <div className="lab-success">{successMsg}</div>}

            <button className="btn btn-primary lab-book-btn" onClick={handleBook}>
              🔒 Confirm Booking
            </button>
          </div>
        ) : (
          <div className="lab-mine-panel">
            {myBookings.length === 0 ? (
              <div className="lab-empty">
                <span className="lab-empty-icon">📅</span>
                <p>You have no upcoming lab bookings this week.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('book')}>
                  Book a Slot Now
                </button>
              </div>
            ) : (
              <div className="my-bookings-list">
                {myBookings.map(b => {
                  const lab = LABS.find(l => l.id === b.labId);
                  return (
                    <div key={b.id} className="my-booking-card glass-panel" style={{ '--lab-color': lab?.color }}>
                      <div className="my-booking-icon">{lab?.icon}</div>
                      <div className="my-booking-info">
                        <strong>{b.labName}</strong>
                        <span>{b.dayLabel} · {b.slot}</span>
                        <span className="booking-purpose">"{b.purpose}"</span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm cancel-booking-btn"
                        onClick={() => handleCancel(b.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
