document.addEventListener('DOMContentLoaded', () => {
  // === ELEMEN DOM ===
  const locationDisplay = document.getElementById('lokasi');
  const dateDisplay = document.getElementById('tanggal-hari-ini');
  const clockDisplay = document.getElementById('live-clock');
  const nextPrayerNameEl = document.getElementById('next-prayer-name');
  const countdownTimerEl = document.getElementById('countdown-timer');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const detectLocationButton = document.getElementById('detect-location-button');
  const searchResultsContainer = document.getElementById('search-results');
  const prayerCards = document.querySelectorAll('.card');

  const prayerTimeElements = {
    Subuh: document.getElementById('subuh'),
    Dzuhur: document.getElementById('dzuhur'),
    Ashar: document.getElementById('ashar'),
    Maghrib: document.getElementById('maghrib'),
    Isya: document.getElementById('isya'),
  };

  // === VARIABEL GLOBAL ===
  let countdownInterval;
  const KEMENAG_API_BASE_URL = 'https://api.myquran.com/v2';
  let adzanAudio = new Audio('fajr_128_44.mp3');
  adzanAudio.preload = 'auto';
  adzanAudio.volume = 0.9;

  // === FUNGSI JAM DAN TANGGAL ===
  function startLiveClock() {
    setInterval(() => {
      const now = new Date();
      clockDisplay.textContent = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }, 1000);
  }

  function displayCurrentDate() {
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // === FUNGSI AMBIL DATA API ===
  async function getPrayerTimes(cityId, cityName) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const response = await fetch(`${KEMENAG_API_BASE_URL}/sholat/jadwal/${cityId}/${year}/${month}/${day}`);
      const result = await response.json();

      if (result.status && result.data && result.data.jadwal) {
        const prayerData = result.data.jadwal;
        updateUIPrayerTimes(prayerData, cityName);
        startCountdown(prayerData);
      } else {
        throw new Error('Data jadwal sholat tidak valid');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil data jadwal sholat.');
      locationDisplay.textContent = 'Gagal memuat data';
    }
  }

  function updateUIPrayerTimes(data, cityName) {
    locationDisplay.textContent = cityName;
    prayerTimeElements.Subuh.textContent = data.subuh;
    prayerTimeElements.Dzuhur.textContent = data.dzuhur;
    prayerTimeElements.Ashar.textContent = data.ashar;
    prayerTimeElements.Maghrib.textContent = data.maghrib;
    prayerTimeElements.Isya.textContent = data.isya;
  }

  // === FUNGSI HITUNG DAN HIGHLIGHT WAKTU BERIKUTNYA ===
  function startCountdown(prayerData) {
    if (countdownInterval) clearInterval(countdownInterval);

    const schedule = [
      { name: 'Subuh', time: prayerData.subuh },
      { name: 'Dzuhur', time: prayerData.dzuhur },
      { name: 'Ashar', time: prayerData.ashar },
      { name: 'Maghrib', time: prayerData.maghrib },
      { name: 'Isya', time: prayerData.isya },
    ];

    countdownInterval = setInterval(() => {
      const now = new Date();
      let next = null;

      for (let s of schedule) {
        const [h, m] = s.time.split(':').map(Number);
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
        if (t > now) {
          next = { ...s, timeObj: t };
          break;
        }
      }

      // jika sudah lewat semua, kembali ke Subuh besok
      if (!next) {
        const [h, m] = schedule[0].time.split(':').map(Number);
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m);
        next = { ...schedule[0], timeObj: t };
      }

      updateCountdownDisplay(next);
      highlightNextPrayerCard(next.name);
      checkAndPlayAdzan(schedule);
    }, 1000);
  }

  function updateCountdownDisplay(next) {
    const now = new Date();
    const diff = next.timeObj - now;

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    nextPrayerNameEl.textContent = next.name;
    countdownTimerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function highlightNextPrayerCard(nextName) {
    prayerCards.forEach(card => {
      const label = card.querySelector('h2').textContent.trim();
      if (label === nextName) {
        card.classList.add('next-prayer-highlight');
      } else {
        card.classList.remove('next-prayer-highlight');
      }
    });
  }

  // === CEK DAN PUTAR ADZAN ===
  function checkAndPlayAdzan(schedule) {
    const now = new Date();
    schedule.forEach(p => {
      const [h, m] = p.time.split(':').map(Number);
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      if (
        now.getHours() === t.getHours() &&
        now.getMinutes() === t.getMinutes() &&
        now.getSeconds() === 0
      ) {
        adzanAudio.play();
        alert(`Sudah masuk waktu ${p.name}`);
      }
    });
  }

  // === PENCARIAN KOTA ===
  async function searchCity() {
    const query = searchInput.value.trim();
    if (query.length < 3) return alert('Masukkan minimal 3 huruf');

    try {
      const res = await fetch(`${KEMENAG_API_BASE_URL}/sholat/kota/cari/${query}`);
      const data = await res.json();
      displaySearchResults(data.data);
    } catch {
      alert('Gagal mencari kota.');
    }
  }

  function displaySearchResults(cities) {
    searchResultsContainer.innerHTML = '';
    if (!cities || cities.length === 0) {
      searchResultsContainer.innerHTML = '<p>Tidak ditemukan</p>';
      return;
    }

    cities.forEach(c => {
      const item = document.createElement('div');
      item.classList.add('result-item');
      item.textContent = c.lokasi;
      item.onclick = () => {
        getPrayerTimes(c.id, c.lokasi);
        searchResultsContainer.innerHTML = '';
        searchInput.value = '';
      };
      searchResultsContainer.appendChild(item);
    });
  }

  // === LOKASI OTOMATIS ===
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung lokasi.');
      getPrayerTimes('1301', 'Jakarta');
      return;
    }

    locationDisplay.textContent = 'Mendeteksi lokasi...';

    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const city = data.address.city || data.address.state || 'Jakarta';
        const searchRes = await fetch(`${KEMENAG_API_BASE_URL}/sholat/kota/cari/${city.split(' ')[0]}`);
        const searchData = await searchRes.json();

        if (searchData.data && searchData.data.length > 0) {
          const { id, lokasi } = searchData.data[0];
          getPrayerTimes(id, lokasi);
        } else {
          getPrayerTimes('1301', 'Jakarta');
        }
      } catch {
        getPrayerTimes('1301', 'Jakarta');
      }
    }, () => {
      getPrayerTimes('1301', 'Jakarta');
    });
  }

  // === EVENT LISTENER ===
  searchButton.onclick = searchCity;
  searchInput.addEventListener('keyup', e => e.key === 'Enter' && searchCity());
  detectLocationButton.onclick = useCurrentLocation;

  // === MULAI ===
  function initialize() {
    startLiveClock();
    displayCurrentDate();
    useCurrentLocation();
  }

  initialize();
});
