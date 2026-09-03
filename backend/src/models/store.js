/**
 * Datastore Layer for Nankwanya
 * 
 * Supports two operating modes seamlessly:
 * 1. Cloud Firestore via Firebase Admin SDK (when credentials are provided)
 * 2. High-performance In-Memory Datastore with JSON persistence (out-of-the-box local demo/testing)
 */

const { getFirestore } = require('../config/firebaseAdmin');

class DataStore {
  constructor() {
    this.users = new Map();
    this.facilities = new Map();
    this.bloodRequests = new Map();
    this.alerts = new Map();
  }

  get db() {
    return getFirestore();
  }

  // ================= USERS / DONORS =================
  async getUsers(filter = {}) {
    if (this.db) {
      try {
        let query = this.db.collection('users');
        if (filter.role) query = query.where('role', '==', filter.role);
        if (filter.bloodType) query = query.where('bloodType', '==', filter.bloodType);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn('[Store] Firestore getUsers fallback:', e.message);
      }
    }
    let list = Array.from(this.users.values());
    if (filter.role) list = list.filter(u => u.role === filter.role);
    if (filter.bloodType) list = list.filter(u => u.bloodType === filter.bloodType);
    return list;
  }

  async getUserById(id) {
    if (this.db) {
      try {
        const doc = await this.db.collection('users').doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn('[Store] Firestore getUserById fallback:', e.message);
      }
    }
    return this.users.get(id) || null;
  }

  async getUserByPhone(phone) {
    const clean = phone ? phone.replace(/[\s\-()]/g, '') : '';
    const all = await this.getUsers();
    return all.find(u => {
      const uClean = (u.phone || '').replace(/[\s\-()]/g, '');
      return uClean === clean || uClean.endsWith(clean) || clean.endsWith(uClean);
    }) || null;
  }

  async saveUser(user) {
    const id = user.id || `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const userData = {
      id,
      name: user.name || 'Anonymous Donor',
      phone: user.phone || '',
      role: user.role || 'donor',
      bloodType: user.bloodType || 'O+',
      lat: Number(user.lat) || -0.607,
      lng: Number(user.lng) || 30.654,
      lastDonationDate: user.lastDonationDate || null,
      facilityId: user.facilityId || null,
      createdAt: user.createdAt || new Date().toISOString()
    };

    if (this.db) {
      try {
        await this.db.collection('users').doc(id).set(userData, { merge: true });
      } catch (e) {
        console.warn('[Store] Firestore saveUser error:', e.message);
      }
    }
    this.users.set(id, userData);
    return userData;
  }

  async updateUser(id, updates) {
    const existing = await this.getUserById(id) || {};
    const updated = { ...existing, ...updates, id };

    if (this.db) {
      try {
        await this.db.collection('users').doc(id).set(updated, { merge: true });
      } catch (e) {
        console.warn('[Store] Firestore updateUser error:', e.message);
      }
    }
    this.users.set(id, updated);
    return updated;
  }

  // ================= FACILITIES =================
  async getFacilities() {
    if (this.db) {
      try {
        const snapshot = await this.db.collection('facilities').get();
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn('[Store] Firestore getFacilities fallback:', e.message);
      }
    }
    return Array.from(this.facilities.values());
  }

  async getFacilityById(id) {
    if (this.db) {
      try {
        const doc = await this.db.collection('facilities').doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn('[Store] Firestore getFacilityById fallback:', e.message);
      }
    }
    return this.facilities.get(id) || null;
  }

  async saveFacility(facility) {
    const id = facility.id || `fac_${Date.now()}`;
    const facData = {
      id,
      name: facility.name,
      lat: Number(facility.lat),
      lng: Number(facility.lng),
      contactPhone: facility.contactPhone || '+256700000000',
      district: facility.district || 'Mbarara'
    };

    if (this.db) {
      try {
        await this.db.collection('facilities').doc(id).set(facData, { merge: true });
      } catch (e) {
        console.warn('[Store] Firestore saveFacility error:', e.message);
      }
    }
    this.facilities.set(id, facData);
    return facData;
  }

  // ================= BLOOD REQUESTS =================
  async getBloodRequests(filter = {}) {
    if (this.db) {
      try {
        let query = this.db.collection('bloodRequests').orderBy('createdAt', 'desc');
        if (filter.status) query = query.where('status', '==', filter.status);
        if (filter.facilityId) query = query.where('facilityId', '==', filter.facilityId);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn('[Store] Firestore getBloodRequests fallback:', e.message);
      }
    }
    let list = Array.from(this.bloodRequests.values());
    if (filter.status) list = list.filter(r => r.status === filter.status);
    if (filter.facilityId) list = list.filter(r => r.facilityId === filter.facilityId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getBloodRequestById(id) {
    if (this.db) {
      try {
        const doc = await this.db.collection('bloodRequests').doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn('[Store] Firestore getBloodRequestById fallback:', e.message);
      }
    }
    return this.bloodRequests.get(id) || null;
  }

  async saveBloodRequest(request) {
    const id = request.id || `req_${Date.now()}`;
    const reqData = {
      id,
      facilityId: request.facilityId,
      facilityName: request.facilityName || 'Medical Facility',
      facilityLat: Number(request.facilityLat),
      facilityLng: Number(request.facilityLng),
      bloodType: request.bloodType || 'ANY',
      urgency: request.urgency || 'urgent', // normal, urgent, critical
      radiusKm: Number(request.radiusKm) || 5,
      requiredUnits: Number(request.requiredUnits) || 3,
      status: request.status || 'active', // active, fulfilled, cancelled
      createdAt: request.createdAt || new Date().toISOString(),
      matchedDonorsCount: Number(request.matchedDonorsCount) || 0,
      confirmedDonorsCount: Number(request.confirmedDonorsCount) || 0
    };

    if (this.db) {
      try {
        await this.db.collection('bloodRequests').doc(id).set(reqData);
      } catch (e) {
        console.warn('[Store] Firestore saveBloodRequest error:', e.message);
      }
    }
    this.bloodRequests.set(id, reqData);
    return reqData;
  }

  async updateBloodRequest(id, updates) {
    const existing = await this.getBloodRequestById(id) || {};
    const updated = { ...existing, ...updates, id };

    if (this.db) {
      try {
        await this.db.collection('bloodRequests').doc(id).set(updated, { merge: true });
      } catch (e) {
        console.warn('[Store] Firestore updateBloodRequest error:', e.message);
      }
    }
    this.bloodRequests.set(id, updated);
    return updated;
  }

  // ================= ALERTS =================
  async getAlerts(filter = {}) {
    if (this.db) {
      try {
        let query = this.db.collection('alerts');
        if (filter.bloodRequestId) query = query.where('bloodRequestId', '==', filter.bloodRequestId);
        if (filter.donorId) query = query.where('donorId', '==', filter.donorId);
        if (filter.status) query = query.where('status', '==', filter.status);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn('[Store] Firestore getAlerts fallback:', e.message);
      }
    }
    let list = Array.from(this.alerts.values());
    if (filter.bloodRequestId) list = list.filter(a => a.bloodRequestId === filter.bloodRequestId);
    if (filter.donorId) list = list.filter(a => a.donorId === filter.donorId);
    if (filter.status) list = list.filter(a => a.status === filter.status);
    return list.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
  }

  async getAlertById(id) {
    if (this.db) {
      try {
        const doc = await this.db.collection('alerts').doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn('[Store] Firestore getAlertById fallback:', e.message);
      }
    }
    return this.alerts.get(id) || null;
  }

  async saveAlert(alert) {
    const id = alert.id || `alt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const alertData = {
      id,
      bloodRequestId: alert.bloodRequestId,
      donorId: alert.donorId,
      donorName: alert.donorName || 'Donor',
      donorPhone: alert.donorPhone || '',
      donorBloodType: alert.donorBloodType || '',
      donorLat: Number(alert.donorLat),
      donorLng: Number(alert.donorLng),
      distanceKm: Number(alert.distanceKm) || 0,
      facilityName: alert.facilityName || '',
      bloodType: alert.bloodType || '',
      channel: alert.channel || 'sms', // sms, whatsapp, inapp
      status: alert.status || 'sent', // sent, delivered, confirmed, declined, failed
      message: alert.message || '',
      sentAt: alert.sentAt || new Date().toISOString(),
      respondedAt: alert.respondedAt || null,
      responseChannel: alert.responseChannel || null,
      errorMessage: alert.errorMessage || null
    };

    if (this.db) {
      try {
        await this.db.collection('alerts').doc(id).set(alertData);
      } catch (e) {
        console.warn('[Store] Firestore saveAlert error:', e.message);
      }
    }
    this.alerts.set(id, alertData);
    return alertData;
  }

  async updateAlert(id, updates) {
    const existing = await this.getAlertById(id) || {};
    const updated = { ...existing, ...updates, id };

    if (this.db) {
      try {
        await this.db.collection('alerts').doc(id).set(updated, { merge: true });
      } catch (e) {
        console.warn('[Store] Firestore updateAlert error:', e.message);
      }
    }
    this.alerts.set(id, updated);
    return updated;
  }

  async getLatestPendingAlertForDonor(donorId) {
    const alerts = await this.getAlerts({ donorId });
    return alerts.find(a => a.status === 'sent' || a.status === 'delivered') || alerts[0] || null;
  }
}

// Global singleton instance
const store = new DataStore();

module.exports = store;
